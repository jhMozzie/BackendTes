// src/modules/matches/match.service.ts

import { PrismaClient, Prisma, Participant, Student, Academy, Phase } from "@prisma/client";
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
// 🎯 ALGORITMO DE SEMBRADO INTELIGENTE MEJORADO
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
 * 🧠 LÓGICA PRINCIPAL MEJORADA: Distribución Estratégica + Previas
 * Genera el array final de Participant IDs o nulls (BYEs) para la Ronda 1.
 */
function seedParticipants(
    participants: ParticipantWithAcademy[],
    tournamentSize: number
): { result: (number | null)[], assignedCount: number } { 
    
    const numParticipants = participants.length;
    const numByes = tournamentSize - numParticipants;
    
    console.log(`🎯 Sembrado: ${numParticipants} participantes, ${tournamentSize} slots, ${numByes} BYEs`);

    // 1. Agrupar por academia
    const academyGroups = new Map<number, ParticipantWithAcademy[]>();
    for (const p of participants) {
        const aid = getParticipantAcademyId(p);
        if (!academyGroups.has(aid)) academyGroups.set(aid, []);
        academyGroups.get(aid)!.push(p);
    }
    
    // Ordenar academias por tamaño (mayor a menor)
    const sortedAcademies = Array.from(academyGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`   Academias: ${sortedAcademies.map(([id, parts]) => `Academia ${id}: ${parts.length}`).join(', ')}`);

    // 2. Estrategia de distribución mejorada
    const bracketSlots: (number | null)[] = new Array(tournamentSize).fill(null);
    const numMatchesR1 = tournamentSize / 2;
    
    // 3. Crear pools separados por academia para distribución estratégica
    const academyPools = new Map<number, ParticipantWithAcademy[]>();
    for (const [academyId, academyParticipants] of sortedAcademies) {
        academyPools.set(academyId, [...academyParticipants]);
    }

    // 4. Algoritmo de asignación por rondas estratégicas
    let assignedCount = 0;
    const assignedParticipants = new Set<number>();
    
    // Primera ronda: Distribuir evitando conflictos de academia
    for (let round = 0; round < 3; round++) { // Múltiples pasadas para mejor distribución
        for (let matchIndex = 0; matchIndex < numMatchesR1; matchIndex++) {
            const slotAkka = matchIndex * 2;
            const slotAo = matchIndex * 2 + 1;
            
            // Si ambos slots ya están llenos, continuar
            if (bracketSlots[slotAkka] !== null && bracketSlots[slotAo] !== null) {
                continue;
            }
            
            // Buscar participantes que no causen conflictos
            for (const [academyId1, pool1] of academyPools) {
                if (pool1.length === 0) continue;
                
                const participant1 = pool1[0];
                if (assignedParticipants.has(participant1.id)) continue;
                
                // Para slot Akka vacío
                if (bracketSlots[slotAkka] === null) {
                    let validForAkka = true;
                    
                    // Verificar conflicto con slot Ao si está ocupado
                    if (bracketSlots[slotAo] !== null) {
                        const aoParticipant = participants.find(p => p.id === bracketSlots[slotAo]);
                        if (aoParticipant && wouldViolateEarlyMatchRule(
                            getParticipantAcademyId(participant1), 
                            getParticipantAcademyId(aoParticipant)
                        )) {
                            validForAkka = false;
                        }
                    }
                    
                    if (validForAkka) {
                        bracketSlots[slotAkka] = participant1.id;
                        assignedParticipants.add(participant1.id);
                        pool1.shift(); // Remover del pool
                        assignedCount++;
                        break;
                    }
                }
                
                // Para slot Ao vacío  
                if (bracketSlots[slotAo] === null) {
                    let validForAo = true;
                    
                    // Verificar conflicto con slot Akka si está ocupado
                    if (bracketSlots[slotAkka] !== null) {
                        const akkaParticipant = participants.find(p => p.id === bracketSlots[slotAkka]);
                        if (akkaParticipant && wouldViolateEarlyMatchRule(
                            getParticipantAcademyId(participant1), 
                            getParticipantAcademyId(akkaParticipant)
                        )) {
                            validForAo = false;
                        }
                    }
                    
                    if (validForAo) {
                        bracketSlots[slotAo] = participant1.id;
                        assignedParticipants.add(participant1.id);
                        pool1.shift(); // Remover del pool
                        assignedCount++;
                        break;
                    }
                }
            }
        }
        
        // Si ya asignamos todos, salir
        if (assignedCount === numParticipants) break;
    }

    // 5. Asignación final forzada para participantes restantes
    const remainingParticipants: ParticipantWithAcademy[] = [];
    for (const [academyId, pool] of academyPools) {
        remainingParticipants.push(...pool);
    }
    
    let remainingIndex = 0;
    for (let i = 0; i < bracketSlots.length && remainingIndex < remainingParticipants.length; i++) {
        if (bracketSlots[i] === null) {
            bracketSlots[i] = remainingParticipants[remainingIndex].id;
            assignedParticipants.add(remainingParticipants[remainingIndex].id);
            remainingIndex++;
            assignedCount++;
        }
    }

    // 6. Distribución estratégica de BYEs
    const participantsWithBye: number[] = [];
    let byeIndex = 0;
    
    // Asignar BYEs a participantes que no tienen oponente
    for (let matchIndex = 0; matchIndex < numMatchesR1; matchIndex++) {
        const slotAkka = matchIndex * 2;
        const slotAo = matchIndex * 2 + 1;
        
        const hasAkka = bracketSlots[slotAkka] !== null;
        const hasAo = bracketSlots[slotAo] !== null;
        
        if (hasAkka && !hasAo) {
            // Crear BYE para el participante existente
            participantsWithBye.push(bracketSlots[slotAkka] as number);
        } else if (!hasAkka && hasAo) {
            // Crear BYE para el participante existente  
            participantsWithBye.push(bracketSlots[slotAo] as number);
        }
    }
    
    // 7. Reorganizar bracket para agrupar BYEs y matches reales
    const finalBracket: (number | null)[] = [...bracketSlots];
    
    // Mover todos los matches con participantes al inicio
    let writeIndex = 0;
    const realMatches: (number | null)[] = [];
    const byeMatches: (number | null)[] = [];
    
    for (let matchIndex = 0; matchIndex < numMatchesR1; matchIndex++) {
        const slotAkka = matchIndex * 2;
        const slotAo = matchIndex * 2 + 1;
        
        const hasAkka = finalBracket[slotAkka] !== null;
        const hasAo = finalBracket[slotAo] !== null;
        
        if (hasAkka && hasAo) {
            // Match real - mantenerlo
            realMatches.push(finalBracket[slotAkka], finalBracket[slotAo]);
        } else if (hasAkka || hasAo) {
            // Match con BYE - procesar después
            byeMatches.push(finalBracket[slotAkka], finalBracket[slotAo]);
        } else {
            // Match vacío - BYE completo
            byeMatches.push(null, null);
        }
    }
    
    // Reconstruir el bracket con matches reales primero
    const optimizedBracket: (number | null)[] = [...realMatches, ...byeMatches];
    
    // 8. Validación final
    const finalAssigned = optimizedBracket.filter(slot => slot !== null).length;
    
    if (finalAssigned !== numParticipants) {
        console.warn(`⚠️  Asignación incompleta: ${finalAssigned}/${numParticipants}`);
        
        // Forzar asignación de faltantes en slots vacíos
        const allParticipantIds = new Set(participants.map(p => p.id));
        const assignedIds = new Set(optimizedBracket.filter(id => id !== null) as number[]);
        const missingIds = Array.from(allParticipantIds).filter(id => !assignedIds.has(id));
        
        let missingIndex = 0;
        const finalSlots = [...optimizedBracket];
        for (let i = 0; i < finalSlots.length && missingIndex < missingIds.length; i++) {
            if (finalSlots[i] === null) {
                finalSlots[i] = missingIds[missingIndex];
                missingIndex++;
            }
        }
        
        console.log(`   ✅ Asignación corregida: ${finalSlots.filter(slot => slot !== null).length}/${numParticipants}`);
        return { result: finalSlots, assignedCount: numParticipants };
    }
    
    console.log(`   ✅ Asignación final: ${finalAssigned}/${numParticipants}`);
    
    // Log de distribución
    console.log(`   📊 Distribución en bracket:`);
    for (let i = 0; i < numMatchesR1; i++) {
        const akkaId = optimizedBracket[i * 2];
        const aoId = optimizedBracket[i * 2 + 1];
        
        const akkaName = akkaId ? participants.find(p => p.id === akkaId)?.student?.firstname : 'BYE';
        const aoName = aoId ? participants.find(p => p.id === aoId)?.student?.firstname : 'BYE';
        
        console.log(`      Match ${i + 1}: ${akkaName} vs ${aoName}`);
    }
    
    return { 
        result: optimizedBracket, 
        assignedCount: numParticipants 
    };
}

export class MatchService {
    
    /**
     * GENERA BRACKETS: Algoritmo optimizado y adaptado
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

                    // SELECCIÓN DE FASES: Ajustar el mapeo para usar solo las fases necesarias.
                    const sortedPhases = allPhases.sort((a, b) => a.order - b.order);
                    
                    if (sortedPhases.length < totalRounds) {
                         throw new Error(`Categoría ${category.code} requiere ${totalRounds} fases, solo hay ${sortedPhases.length}.`);
                    }

                    // Seleccionar solo las 'totalRounds' fases necesarias
                    const requiredPhases = sortedPhases.slice(sortedPhases.length - totalRounds);

                    // SEEDING INTELIGENTE
                    const { result: seededParticipants, assignedCount } = seedParticipants(participants, bracketSize);
                    
                    // MANEJO DE ERRORES: VALIDACIÓN CRÍTICA DE CONTEO
                    if (assignedCount !== numParticipants) {
                        throw new Error(
                            `❌ Error Crítico: La Categoría ${category.code} ingresó ${numParticipants} participantes, ` +
                            `pero el algoritmo solo logró asignar ${assignedCount}.`
                        );
                    }
                    
                    let previousRoundMatches: any[] = [];

                    // Generar todas las rondas
                    for (let r = 0; r < totalRounds; r++) {
                        
                        const phase = requiredPhases[r];
                        const numMatchesInRound = bracketSize / Math.pow(2, r + 1);
                        const currentRoundMatches: any[] = [];
                        
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

                            // Asignar participantes en la PRIMERA ronda del bracket (cuando r=0)
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
                                } 
                                else if (!akkaId && aoId) {
                                    newMatchData.winnerId = aoId;
                                    newMatchData.status = "Completado"; 
                                }
                                
                                // Logging para verificar choques
                                if (akkaId !== null && aoId !== null) {
                                    const p1Acad = participants.find(p => p.id === akkaId)?.student?.academy?.id ?? 0;
                                    const p2Acad = participants.find(p => p.id === aoId)?.student?.academy?.id ?? 0;
                                    
                                    if (p1Acad === p2Acad && p1Acad !== 0) {
                                        console.warn(`      ⚠️ Choque Academia: Match ${i + 1} (${p1Acad} vs ${p2Acad})`);
                                    }
                                }

                                const p1 = participants.find(x => x.id === newMatchData.participantAkkaId);
                                const p2 = participants.find(x => x.id === newMatchData.participantAoId);
                                const p1Name = p1 ? `${p1.student?.firstname} ${p1.student?.lastname}` : 'BYE';
                                const p2Name = p2 ? `${p2.student?.firstname} ${p2.student?.lastname}` : 'BYE';
                                console.log(`      ⚔️ Match ${i + 1}: ${p1Name} vs ${p2Name} (${newMatchData.status})`);
                            }
                            
                            const createdMatch = await tx.match.create({ data: newMatchData });
                            currentRoundMatches.push(createdMatch);
                        }
                        
                        // Conectar rondas
                        if (r > 0) { 
                            for (let i = 0; i < numMatchesInRound; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                
                                const prevMatch1 = previousRoundMatches[i * 2];
                                const prevMatch2 = previousRoundMatches[i * 2 + 1];
                                
                                // Establecer Punteros nextMatchId
                                if (prevMatch1) {
                                    await tx.match.update({
                                        where: { id: prevMatch1.id },
                                        data: { nextMatchId: currentMatchId, nextMatchSide: 'Akka' }
                                    });
                                    
                                    // Promover ganador de BYE automáticamente
                                    if (prevMatch1.status === "Completado" && prevMatch1.winnerId) {
                                        await tx.match.update({
                                            where: { id: currentMatchId },
                                            data: { participantAkkaId: prevMatch1.winnerId }
                                        });
                                    }
                                }
                                if (prevMatch2) {
                                    await tx.match.update({
                                        where: { id: prevMatch2.id },
                                        data: { nextMatchId: currentMatchId, nextMatchSide: 'Ao' }
                                    });
                                    
                                    // Promover ganador de BYE automáticamente
                                    if (prevMatch2.status === "Completado" && prevMatch2.winnerId) {
                                        await tx.match.update({
                                            where: { id: currentMatchId },
                                            data: { participantAoId: prevMatch2.winnerId }
                                        });
                                    }
                                }
                            }
                        }
                        previousRoundMatches = currentRoundMatches;
                    }
                }
                
                return { message: `Brackets generados con sembrado adaptado.` };
            }, { timeout: 60000 });
            
        } catch (error) {
            console.error(`❌ ERROR BRACKETS:`, error);
            throw error;
        }
    }

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