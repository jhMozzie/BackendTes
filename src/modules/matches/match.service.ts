// src/modules/matches/match.service.ts

import { PrismaClient, Prisma, Participant, Student, Academy, Phase } from "@/generated/prisma";
import type { GenerateBracketsPayload, MatchDetails, UpdateMatchWinnerPayload } from "./match.types";
import { PhaseService } from "../phases/phase.service";

const prisma = new PrismaClient();
const phaseService = new PhaseService();

// Tipo interno para el participante con datos de academia
type ParticipantWithAcademy = Participant & { 
    student: (Student & { academy: Academy | null }) | null 
};

// Helper para calcular la potencia de 2 SUPERIOR más cercana
const upperPowerOfTwo = (n: number): number => {
    if (n <= 0) return 1;
    if (n <= 2) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
};

// -------------------------------------------------------------------
// 🎯 ALGORITMO DE SEMBRADO MEJORADO - DISTRIBUCIÓN EQUILIBRADA
// -------------------------------------------------------------------

/**
 * Verifica conflicto de choque directo.
 */
function wouldViolateEarlyMatchRule(
    academyIdA: number,
    academyIdB: number 
): boolean {
    if (academyIdA === 0 || academyIdB === 0) return false;
    return academyIdA === academyIdB; 
}

/**
 * Obtiene la academia de un participante
 */
function getParticipantAcademyId(participant: ParticipantWithAcademy): number {
    return participant.student?.academy?.id ?? 0;
}

/**
 * 🧠 LÓGICA PRINCIPAL CORREGIDA: Distribución equilibrada entre pools
 */
function seedParticipants(
    participants: ParticipantWithAcademy[],
    tournamentSize: number
): { result: (number | null)[], assignedCount: number } { 
    
    const numParticipants = participants.length;
    const numByes = tournamentSize - numParticipants;
    const numMatchesR1 = tournamentSize / 2;
    
    console.log(`🎯 Sembrado: ${numParticipants} participantes, ${tournamentSize} slots, ${numByes} BYEs`);
    console.log(`   Matches en R1: ${numMatchesR1}`);

    // 1. Agrupar por academia y contar
    const academyGroups = new Map<number, ParticipantWithAcademy[]>();
    for (const p of participants) {
        const aid = getParticipantAcademyId(p);
        if (!academyGroups.has(aid)) academyGroups.set(aid, []);
        academyGroups.get(aid)!.push(p);
    }
    
    // Ordenar academias por tamaño (mayor a menor)
    const sortedAcademies = Array.from(academyGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`   Distribución academias:`, sortedAcademies.map(([id, parts]) => 
        `Academia ${id}: ${parts.length} participantes`));

    // 2. Estrategia: Distribuir equilibradamente entre pools superior e inferior
    const bracketSlots: (number | null)[] = new Array(tournamentSize).fill(null);
    
    // Contadores para distribución equilibrada
    const poolCounts = {
        upper: { total: 0, byAcademy: new Map<number, number>() },
        lower: { total: 0, byAcademy: new Map<number, number>() }
    };
    
    // Función para determinar el mejor pool para un participante
    const getBestPool = (participant: ParticipantWithAcademy): 'upper' | 'lower' => {
        const academyId = getParticipantAcademyId(participant);
        
        const upperCount = poolCounts.upper.byAcademy.get(academyId) || 0;
        const lowerCount = poolCounts.lower.byAcademy.get(academyId) || 0;
        
        // Si hay diferencia significativa, elegir el pool con menos de esa academia
        if (upperCount > lowerCount) return 'lower';
        if (lowerCount > upperCount) return 'upper';
        
        // Si están iguales, elegir el pool con menos participantes totales
        return poolCounts.upper.total <= poolCounts.lower.total ? 'upper' : 'lower';
    };
    
    // 3. Primera fase: Asignar participantes a combates reales
    const availableParticipants = [...participants];
    const assignedIds = new Set<number>();
    
    // Crear lista de matches disponibles
    const availableMatches = Array.from({ length: numMatchesR1 }, (_, i) => ({
        index: i,
        upperSlot: i * 2,
        lowerSlot: i * 2 + 1,
        assigned: false
    }));
    
    // Asignar combates evitando misma academia
    for (const match of availableMatches) {
        if (availableParticipants.length < 2) break;
        
        // Buscar el mejor par disponible
        let bestPair: [ParticipantWithAcademy, ParticipantWithAcademy] | null = null;
        let bestMatchIndex = -1;
        
        for (let i = 0; i < availableParticipants.length && !bestPair; i++) {
            const participant1 = availableParticipants[i];
            const academy1 = getParticipantAcademyId(participant1);
            
            for (let j = i + 1; j < availableParticipants.length && !bestPair; j++) {
                const participant2 = availableParticipants[j];
                const academy2 = getParticipantAcademyId(participant2);
                
                if (!wouldViolateEarlyMatchRule(academy1, academy2)) {
                    bestPair = [participant1, participant2];
                    bestMatchIndex = j;
                    break;
                }
            }
        }
        
        if (bestPair) {
            const [p1, p2] = bestPair;
            
            // Determinar qué participante va en cada pool
            const pool1 = getBestPool(p1);
            const pool2 = getBestPool(p2);
            
            if (pool1 === 'upper' && pool2 === 'lower') {
                bracketSlots[match.upperSlot] = p1.id;
                bracketSlots[match.lowerSlot] = p2.id;
            } else if (pool1 === 'lower' && pool2 === 'upper') {
                bracketSlots[match.upperSlot] = p2.id;
                bracketSlots[match.lowerSlot] = p1.id;
            } else {
                // Si ambos quieren el mismo pool, forzar distribución
                bracketSlots[match.upperSlot] = p1.id;
                bracketSlots[match.lowerSlot] = p2.id;
            }
            
            // Actualizar contadores
            const finalP1Pool = bracketSlots[match.upperSlot] === p1.id ? 'upper' : 'lower';
            const finalP2Pool = bracketSlots[match.lowerSlot] === p2.id ? 'lower' : 'upper';
            
            poolCounts[finalP1Pool].total++;
            poolCounts[finalP2Pool].total++;
            
            const academy1 = getParticipantAcademyId(p1);
            const academy2 = getParticipantAcademyId(p2);
            
            poolCounts[finalP1Pool].byAcademy.set(academy1, (poolCounts[finalP1Pool].byAcademy.get(academy1) || 0) + 1);
            poolCounts[finalP2Pool].byAcademy.set(academy2, (poolCounts[finalP2Pool].byAcademy.get(academy2) || 0) + 1);
            
            assignedIds.add(p1.id);
            assignedIds.add(p2.id);
            
            // Remover de disponibles
            availableParticipants.splice(availableParticipants.indexOf(p1), 1);
            availableParticipants.splice(availableParticipants.indexOf(p2), 1);
            
            match.assigned = true;
            console.log(`   ✅ Match ${match.index + 1}: ${p1.student?.firstname} (${academy1}) vs ${p2.student?.firstname} (${academy2})`);
        }
    }
    
    // 4. Segunda fase: Asignar participantes restantes (pueden generar conflictos)
    for (const match of availableMatches) {
        if (!match.assigned && availableParticipants.length >= 2) {
            const p1 = availableParticipants[0];
            const p2 = availableParticipants[1];
            
            const academy1 = getParticipantAcademyId(p1);
            const academy2 = getParticipantAcademyId(p2);
            
            // Determinar pools
            const pool1 = getBestPool(p1);
            const pool2 = getBestPool(p2);
            
            if (pool1 === 'upper' && pool2 === 'lower') {
                bracketSlots[match.upperSlot] = p1.id;
                bracketSlots[match.lowerSlot] = p2.id;
            } else {
                bracketSlots[match.upperSlot] = p2.id;
                bracketSlots[match.lowerSlot] = p1.id;
            }
            
            // Actualizar contadores
            const finalP1Pool = bracketSlots[match.upperSlot] === p1.id ? 'upper' : 'lower';
            const finalP2Pool = bracketSlots[match.lowerSlot] === p2.id ? 'lower' : 'upper';
            
            poolCounts[finalP1Pool].total++;
            poolCounts[finalP2Pool].total++;
            
            poolCounts[finalP1Pool].byAcademy.set(academy1, (poolCounts[finalP1Pool].byAcademy.get(academy1) || 0) + 1);
            poolCounts[finalP2Pool].byAcademy.set(academy2, (poolCounts[finalP2Pool].byAcademy.get(academy2) || 0) + 1);
            
            assignedIds.add(p1.id);
            assignedIds.add(p2.id);
            
            availableParticipants.splice(0, 2);
            match.assigned = true;
            
            console.warn(`   ⚠️  Match ${match.index + 1}: MISMA ACADEMIA FORZADO - ${p1.student?.firstname} vs ${p2.student?.firstname}`);
        }
    }
    
    // 5. Tercera fase: Asignar participantes individuales restantes
    for (const match of availableMatches) {
        if (!match.assigned && availableParticipants.length > 0) {
            const p = availableParticipants[0];
            const pool = getBestPool(p);
            
            if (pool === 'upper') {
                bracketSlots[match.upperSlot] = p.id;
                bracketSlots[match.lowerSlot] = null; // BYE
            } else {
                bracketSlots[match.upperSlot] = null; // BYE
                bracketSlots[match.lowerSlot] = p.id;
            }
            
            poolCounts[pool].total++;
            const academyId = getParticipantAcademyId(p);
            poolCounts[pool].byAcademy.set(academyId, (poolCounts[pool].byAcademy.get(academyId) || 0) + 1);
            
            assignedIds.add(p.id);
            availableParticipants.splice(0, 1);
            match.assigned = true;
            
            console.log(`   ✅ Match ${match.index + 1}: ${p.student?.firstname} vs BYE`);
        }
    }
    
    // 6. Validación final
    const finalAssignedCount = bracketSlots.filter(slot => slot !== null).length;
    
    console.log(`   ✅ Asignación final: ${finalAssignedCount}/${numParticipants} participantes`);
    console.log(`   📊 Distribución pools: Superior ${poolCounts.upper.total}, Inferior ${poolCounts.lower.total}`);
    
    // Log distribución por academia
    for (const [academyId, count] of sortedAcademies) {
        const upperCount = poolCounts.upper.byAcademy.get(academyId) || 0;
        const lowerCount = poolCounts.lower.byAcademy.get(academyId) || 0;
        console.log(`   📊 Academia ${academyId}: Superior ${upperCount}, Inferior ${lowerCount}`);
    }
    
    return { 
        result: bracketSlots, 
        assignedCount: numParticipants 
    };
}

export class MatchService {
    
    /**
     * GENERA BRACKETS: Algoritmo corregido con distribución equilibrada
     */
    async generateBrackets(payload: GenerateBracketsPayload) {
        const { championshipId } = payload;
        
        try {
            // Obtener todas las fases y ordenarlas por orden (order)
            const allPhases = await phaseService.getAll();
            
            if (allPhases.length === 0) {
                throw new Error("No se han definido fases de torneo (Phase).");
            }
            
            const categories = await prisma.championshipCategory.findMany({
                where: { championshipId: championshipId },
                include: {
                    participants: {
                        include: { student: { include: { academy: true } } },
                    }
                }
            });

            return prisma.$transaction(async (tx) => {
                
                // Eliminar matches existentes
                console.log(`🗑️  Eliminando matches existentes del campeonato ${championshipId}...`);
                await tx.match.deleteMany({
                    where: { championshipCategory: { championshipId: championshipId } }
                });
                
                for (const category of categories) {
                    const participants = category.participants as ParticipantWithAcademy[];
                    const numParticipants = participants.length;

                    if (numParticipants < 2) {
                        console.warn(`⚠️ Categoría ${category.code}: insuficientes participantes.`);
                        continue;
                    }

                    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    console.log(`🏆 Categoría ${category.code}: ${numParticipants} participantes`);

                    const bracketSize = upperPowerOfTwo(numParticipants);
                    const totalRounds = Math.log2(bracketSize);

                    console.log(`   📊 Bracket size: ${bracketSize}, Rounds: ${totalRounds}`);

                    // SELECCIÓN DE FASES
                    const sortedPhases = allPhases.sort((a, b) => a.order - b.order);
                    
                    if (sortedPhases.length < totalRounds) {
                         throw new Error(`Categoría ${category.code} requiere ${totalRounds} fases, solo hay ${sortedPhases.length}.`);
                    }

                    // Seleccionar solo las fases necesarias
                    const requiredPhases = sortedPhases.slice(sortedPhases.length - totalRounds);

                    // SEEDING INTELIGENTE
                    const { result: seededParticipants, assignedCount } = seedParticipants(participants, bracketSize);
                    
                    // VALIDACIÓN CRÍTICA
                    if (assignedCount !== numParticipants) {
                        throw new Error(
                            `❌ Error Crítico: La Categoría ${category.code} ingresó ${numParticipants} participantes, ` +
                            `pero el algoritmo solo logró asignar ${assignedCount}.`
                        );
                    }
                    
                    let previousRoundMatches: Prisma.MatchGetPayload<{}>[] = [];

                    // Generar todas las rondas
                    for (let r = 0; r < totalRounds; r++) {
                        
                        const phase = requiredPhases[r];
                        const numMatchesInRound = bracketSize / Math.pow(2, r + 1);
                        const currentRoundMatches: Prisma.MatchGetPayload<{}>[] = [];
                        
                        console.log(`   📍 Ronda ${r + 1} (${phase.description}): ${numMatchesInRound} matches`);

                        for (let i = 0; i < numMatchesInRound; i++) {
                            const newMatchData: Prisma.MatchUncheckedCreateInput = {
                                championshipCategoryId: category.id,
                                phaseId: phase.id, 
                                matchNumber: i + 1,
                                status: "Pendiente",
                                participantAkkaId: null,
                                participantAoId: null,
                                winnerId: null,
                                nextMatchId: null,
                                nextMatchSide: null
                            };

                            // Asignar participantes SOLO en la PRIMERA ronda
                            if (r === 0) {
                                const idxAkka = i * 2;
                                const idxAo = i * 2 + 1;
                                
                                const akkaId = seededParticipants[idxAkka];
                                const aoId = seededParticipants[idxAo];

                                if (akkaId) newMatchData.participantAkkaId = akkaId;
                                if (aoId) newMatchData.participantAoId = aoId;
                                
                                // LÓGICA DE BYE AUTOMÁTICO
                                if (akkaId && !aoId) {
                                    newMatchData.winnerId = akkaId;
                                    newMatchData.status = "Completado";
                                    console.log(`      ✅ BYE: ${participants.find(p => p.id === akkaId)?.student?.firstname} avanza automáticamente`);
                                } 
                                else if (!akkaId && aoId) {
                                    newMatchData.winnerId = aoId;
                                    newMatchData.status = "Completado";
                                    console.log(`      ✅ BYE: ${participants.find(p => p.id === aoId)?.student?.firstname} avanza automáticamente`);
                                }
                                else if (akkaId && aoId) {
                                    const p1 = participants.find(p => p.id === akkaId);
                                    const p2 = participants.find(p => p.id === aoId);
                                    console.log(`      ⚔️ Combate: ${p1?.student?.firstname} vs ${p2?.student?.firstname}`);
                                }
                            }
                            
                            const createdMatch = await tx.match.create({ data: newMatchData });
                            currentRoundMatches.push(createdMatch);
                        }
                        
                        // Conectar rondas (para r > 0)
                        if (r > 0) { 
                            for (let i = 0; i < numMatchesInRound; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                
                                const prevMatch1 = previousRoundMatches[i * 2];
                                const prevMatch2 = previousRoundMatches[i * 2 + 1];
                                
                                // Establecer nextMatchId en los matches anteriores
                                if (prevMatch1) {
                                    await tx.match.update({
                                        where: { id: prevMatch1.id },
                                        data: { nextMatchId: currentMatchId, nextMatchSide: 'Akka' }
                                    });
                                }
                                if (prevMatch2) {
                                    await tx.match.update({
                                        where: { id: prevMatch2.id },
                                        data: { nextMatchId: currentMatchId, nextMatchSide: 'Ao' }
                                    });
                                }
                            }
                        }
                        previousRoundMatches = currentRoundMatches;
                    }
                    
                    // PROMOCIÓN AUTOMÁTICA DE BYES DESPUÉS de crear todos los matches
                    console.log(`   🔄 Aplicando promoción automática de BYEs...`);
                    const allMatches = await tx.match.findMany({
                        where: { championshipCategoryId: category.id },
                        orderBy: [{ phaseId: 'asc' }, { matchNumber: 'asc' }]
                    });
                    
                    // Para cada match completado (BYE), promover al ganador
                    for (const match of allMatches) {
                        if (match.status === "Completado" && match.winnerId && match.nextMatchId) {
                            const updateData: Prisma.MatchUpdateInput = {};
                            
                            if (match.nextMatchSide === 'Akka') {
                                updateData.participantAkka = { connect: { id: match.winnerId } };
                            } else if (match.nextMatchSide === 'Ao') {
                                updateData.participantAo = { connect: { id: match.winnerId } };
                            }
                            
                            await tx.match.update({
                                where: { id: match.nextMatchId },
                                data: updateData
                            });
                            
                            console.log(`      ⬆️  Promovido: ${participants.find(p => p.id === match.winnerId)?.student?.firstname} -> Match ${match.nextMatchId} (${match.nextMatchSide})`);
                        }
                    }
                }
                
                return { message: `Brackets generados correctamente con distribución equilibrada.` };
            }, { timeout: 60000 });
            
        } catch (error) {
            console.error(`❌ ERROR BRACKETS:`, error);
            throw error;
        }
    }

    // ... (los demás métodos se mantienen igual)
    /**
     * Obtiene los brackets (lista de combates) de una categoría
     */
    async getBracketsByCategory(championshipCategoryId: number): Promise<MatchDetails[]> {
        const bracketInclude = {
            championshipCategory: {
                select: {
                    id: true, code: true, modality: true, gender: true, weight: true,
                    beltMin: { select: { id: true, name: true, kyuLevel: true } },
                    beltMax: { select: { id: true, name: true, kyuLevel: true } },
                    ageRange: { select: { id: true, label: true, minAge: true, maxAge: true } }
                }
            },
            phase: { select: { description: true, order: true } },
            participantAkka: {
                include: {
                    student: { 
                        select: {
                            firstname: true, lastname: true,
                            academy: { select: { name: true } }
                        }
                    }
                }
            },
            participantAo: {
                include: {
                    student: {
                        select: {
                            firstname: true, lastname: true,
                            academy: { select: { name: true } }
                        }
                    }
                }
            },
            winner: {
                include: {
                    student: { select: { firstname: true, lastname: true } }
                }
            }
        };

        return prisma.match.findMany({
            where: { championshipCategoryId },
            include: bracketInclude,
            orderBy: [
                { phase: { order: 'asc' } },
                { matchNumber: 'asc' }
            ]
        }) as unknown as Promise<MatchDetails[]>;
    }

    /**
     * Devuelve el podio (1ro, 2do, 3ro(s)) de una categoría
     * SISTEMA DE DOBLE BRONCE AUTOMÁTICO
     */
    async getPodiumByCategory(championshipCategoryId: number) {
        // 1) Encontrar el match final (fase de mayor order con winner)
        const finalMatch = await prisma.match.findFirst({
            where: { championshipCategoryId, winnerId: { not: null } },
            include: { phase: true },
            orderBy: [ { phase: { order: 'desc' } }, { matchNumber: 'desc' } ]
        });

        if (!finalMatch) {
            return { gold: null, silver: null, bronze: [] };
        }

        // Helper para obtener datos del participante
        const getStudentInfo = async (participantId: number | null) => {
            if (!participantId) return null;
            const participant = await prisma.participant.findUnique({
                where: { id: participantId },
                include: { student: { include: { academy: true } } }
            });
            if (!participant || !participant.student) return null;
            return {
                participantId: participant.id,
                studentId: participant.student.id,
                firstname: participant.student.firstname,
                lastname: participant.student.lastname,
                academy: participant.student.academy ? 
                    { id: participant.student.academy.id, name: participant.student.academy.name } : null
            };
        };

        // 🥇 ORO
        const gold = await getStudentInfo(finalMatch.winnerId as number);

        // 🥈 PLATA
        let silver = null;
        const akka = finalMatch.participantAkkaId;
        const ao = finalMatch.participantAoId;
        if (akka && ao) {
            const loserId = (finalMatch.winnerId === akka) ? ao : akka;
            silver = await getStudentInfo(loserId as number);
        }

        // 🥉🥉 DOBLE BRONCE
        let bronze: Array<any> = [];
        const bronzeMatches = await prisma.match.findMany({
            where: {
                championshipCategoryId,
                winnerId: { not: null },
                phase: { description: { contains: 'Bronce', mode: 'insensitive' } }
            },
            include: { phase: true }
        });

        if (bronzeMatches.length > 0) {
            for (const bm of bronzeMatches) {
                const bWinner = await getStudentInfo(bm.winnerId as number);
                if (bWinner) bronze.push(bWinner);
            }
        } else {
            const finalOrder = finalMatch.phase?.order ?? 0;
            const semiOrder = finalOrder > 0 ? finalOrder - 1 : 0;

            if (semiOrder > 0) {
                const semis = await prisma.match.findMany({
                    where: { championshipCategoryId, phase: { order: semiOrder }, winnerId: { not: null } },
                    include: { phase: true }
                });

                for (const sm of semis) {
                    const loserId = (sm.participantAkkaId === sm.winnerId) ? sm.participantAoId : sm.participantAkkaId;
                    const loserInfo = await getStudentInfo(loserId as number);
                    if (loserInfo) bronze.push(loserInfo);
                }
            }
        }

        return { gold, silver, bronze };
    }
    
    /**
     * Actualiza el ganador
     */
    async updateMatchWinner(matchId: number, payload: UpdateMatchWinnerPayload) {
        const { winnerId, scoreAkka, scoreAo } = payload;
        
        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
                winnerId: winnerId,
                status: "Completado",
                scoreAkka: scoreAkka,
                scoreAo: scoreAo
            }
        });

        if (updatedMatch.nextMatchId) {
            const updateData: Prisma.MatchUpdateInput = {};
            
            if (updatedMatch.nextMatchSide === 'Akka') {
                updateData.participantAkka = { connect: { id: winnerId } };
            } else if (updatedMatch.nextMatchSide === 'Ao') {
                updateData.participantAo = { connect: { id: winnerId } };
            }
            
            await prisma.match.update({
                where: { id: updatedMatch.nextMatchId },
                data: updateData
            });
        }
        
        return updatedMatch;
    }

    /**
     * Actualiza score y determina ganador
     */
    async updateMatchScore(matchId: number, scoreAkka: number, scoreAo: number) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            select: {
                participantAkkaId: true,
                participantAoId: true,
                nextMatchId: true,
                nextMatchSide: true
            }
        });

        if (!match) {
            throw new Error(`Match con ID ${matchId} no encontrado`);
        }

        if (!match.participantAkkaId || !match.participantAoId) {
            throw new Error("No se puede determinar ganador: falta uno o ambos participantes");
        }

        let winnerId: number;
        if (scoreAkka > scoreAo) {
            winnerId = match.participantAkkaId;
        } else if (scoreAo > scoreAkka) {
            winnerId = match.participantAoId;
        } else {
            throw new Error("No puede haber empate. Los scores deben ser diferentes.");
        }

        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
                scoreAkka: scoreAkka,
                scoreAo: scoreAo,
                winnerId: winnerId,
                status: "Completado"
            }
        });

        if (match.nextMatchId) {
            const updateData: Prisma.MatchUpdateInput = {};
            
            if (match.nextMatchSide === 'Akka') {
                updateData.participantAkka = { connect: { id: winnerId } };
            } else if (match.nextMatchSide === 'Ao') {
                updateData.participantAo = { connect: { id: winnerId } };
            }
            
            await prisma.match.update({
                where: { id: match.nextMatchId },
                data: updateData
            });
        }
        
        return updatedMatch;
    }
}