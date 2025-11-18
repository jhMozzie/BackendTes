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

// 💥 Helper para calcular la potencia de 2 SUPERIOR más cercana
const upperPowerOfTwo = (n: number): number => {
    if (n <= 0) return 1;
    if (n <= 2) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
};

// -------------------------------------------------------------------
// 🎯 ALGORITMO DE SEMBRADO INTELIGENTE (PREVIAS, DISPERSIÓN, ANTI-REPETICIÓN)
// -------------------------------------------------------------------

interface SeedingSlot {
    round: number;
    matchNumber: number;
    side: 'Akka' | 'Ao';
    pool: 'A' | 'B';
    type: 'PLAY_IN' | 'BYE_SLOT'; 
    participantId: number | null;
    academyId: number;
    priorityScore: number; 
}

/**
 * Genera el patrón de distribución (Play-in vs Bye) de forma generalizable.
 */
function getPlayInPattern(totalMatchesInRound: number, activeMatchesNeeded: number): boolean[] {
    const pattern = new Array(totalMatchesInRound).fill(false);
    
    if (activeMatchesNeeded === totalMatchesInRound) return pattern.fill(true);
    if (activeMatchesNeeded === 0) return pattern;

    // Lógica de dispersión de peleas activas
    const step = totalMatchesInRound / activeMatchesNeeded;
    for (let i = 0; i < activeMatchesNeeded; i++) {
        const index = Math.floor(i * step);
        pattern[index] = true;
    }
    
    return pattern;
}

/**
 * Crea la estructura virtual del bracket marcando slots de Pelea y slots de Bye
 */
function generateBracketStructure(
    bracketSize: number, 
    numParticipants: number
): Map<string, SeedingSlot> {
    const numRounds = Math.log2(bracketSize);
    const slots = new Map<string, SeedingSlot>();
    
    const matchesInR1 = bracketSize / 2;
    // Cálculo de Previas: N - (Size/2). Se asegura que no sea negativo.
    const activeMatchesNeeded = Math.max(0, numParticipants - matchesInR1);
    
    const matchPattern = getPlayInPattern(matchesInR1, activeMatchesNeeded);

    console.log(`   🧩 Patrón de Previas (R1): ${matchPattern.map(x => x ? '⚔️' : '🛡️').join(' ')}`);

    for (let r = 1; r <= numRounds; r++) {
        const numMatchesInRound = bracketSize / Math.pow(2, r);
        const matchesPerPool = Math.ceil(numMatchesInRound / 2);
        
        for (let m = 0; m < numMatchesInRound; m++) {
            const pool = m < matchesPerPool ? 'A' : 'B';
            
            let slotType: 'PLAY_IN' | 'BYE_SLOT' = 'PLAY_IN';
            
            if (r === 1) {
                if (!matchPattern[m]) {
                    slotType = 'BYE_SLOT';
                }
            }

            slots.set(`${r}-${m + 1}-Akka`, {
                round: r, matchNumber: m + 1, side: 'Akka', pool, type: slotType,
                participantId: null, academyId: 0, priorityScore: 0
            });
            slots.set(`${r}-${m + 1}-Ao`, {
                round: r, matchNumber: m + 1, side: 'Ao', pool, type: slotType,
                participantId: null, academyId: 0, priorityScore: 0
            });
        }
    }
    return slots;
}

/**
 * Encuentra slots disponibles (Solo Akka para BYE_SLOT)
 */
function findAvailableSlots(
    slots: Map<string, SeedingSlot>,
    typeNeeded: 'PLAY_IN' | 'BYE_SLOT',
    totalMatchesInR1: number,
    pool?: 'A' | 'B'
): SeedingSlot[] {
    const available: SeedingSlot[] = [];
    
    for (const slot of slots.values()) {
        if (slot.round === 1 && slot.participantId === null && (!pool || slot.pool === pool)) {
            
            if (typeNeeded === 'PLAY_IN' && slot.type === 'PLAY_IN') {
                available.push(slot);
            } 
            else if (typeNeeded === 'BYE_SLOT' && slot.type === 'BYE_SLOT' && slot.side === 'Akka') {
                // REGLA DE EXTREMOS para BYE
                const distFromStart = slot.matchNumber - 1;
                const distFromEnd = totalMatchesInR1 - slot.matchNumber;
                const minEdgeDist = Math.min(distFromStart, distFromEnd);
                
                slot.priorityScore = 100 - minEdgeDist; 
                available.push(slot);
            }
        }
    }
    return available;
}

/**
 * Verifica conflicto de choque directo O repetición de enfrentamiento en el mismo pool.
 */
function wouldViolateEarlyMatchRule(
    slots: Map<string, SeedingSlot>,
    slotToAssign: SeedingSlot,
    academyId: number,
    targetOpponentAcademyId: number // 0 si el slot par está vacío
): boolean {
    if (academyId === 0) return false;
    
    // 1. Conflicto directo (misma academia vs misma academia)
    if (targetOpponentAcademyId === academyId) {
        return true; 
    }
    
    // 2. REGLA DE ANTI-REPETICIÓN DE ENFRENTAMIENTO EN EL MISMO POOL
    if (targetOpponentAcademyId !== 0) {
        const targetPool = slotToAssign.pool;
        
        for (const slot of slots.values()) {
            if (slot.round === 1 && slot.pool === targetPool && slot.participantId !== null) {
                
                const opponentSlot = slots.get(`${slot.round}-${slot.matchNumber}-${slot.side === 'Akka' ? 'Ao' : 'Akka'}`);
                
                if (opponentSlot && opponentSlot.participantId !== null) {
                    const existingAcad1 = slot.academyId;
                    const existingAcad2 = opponentSlot.academyId;

                    // Si la combinación de IDs de academia es la misma que la que estamos intentando asignar, rechazar.
                    const newPair = [academyId, targetOpponentAcademyId].sort().join('-');
                    const existingPair = [existingAcad1, existingAcad2].sort().join('-');
                    
                    if (newPair === existingPair) {
                        return true; 
                    }
                }
            }
        }
    }
    
    return false;
}

/**
 * 🧠 LÓGICA PRINCIPAL: Distribución Estratégica + Previas
 */
function seedParticipantsWithSymmetry(
    participants: ParticipantWithAcademy[],
    bracketSize: number
): { result: (number | null)[], assignedCount: number } { 
    
    console.log(`\n🎲 SEMBRADO ESTRATÉGICO (${participants.length} pax / Bracket ${bracketSize})`);
    
    // 1. Agrupar y Ordenar Academias (Grandes -> Pequeñas)
    const academyGroups = new Map<number, ParticipantWithAcademy[]>();
    for (const p of participants) {
        const aid = p.student?.academy?.id ?? 0;
        if (!academyGroups.has(aid)) academyGroups.set(aid, []);
        academyGroups.get(aid)!.push(p);
    }
    
    const sortedAcademies = Array.from(academyGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);
    
    const largestAcademyId = sortedAcademies[0][0];
    
    // 2. Estructura del Bracket y Slots
    const slots = generateBracketStructure(bracketSize, participants.length);
    const totalMatchesR1 = bracketSize / 2;

    const activeMatchesCount = participants.length - totalMatchesR1; 
    const activeSlotsCount = activeMatchesCount * 2; 
    
    let allParticipantsSorted: ParticipantWithAcademy[] = [];
    sortedAcademies.forEach(([_, stu]) => allParticipantsSorted.push(...stu));

    // DIVISIÓN DE POBLACIÓN:
    const gladiators = allParticipantsSorted.slice(0, activeSlotsCount);
    const seeds = allParticipantsSorted.slice(activeSlotsCount).reverse(); 

    console.log(`   📊 Distribución: ${gladiators.length} a Previas, ${seeds.length} a Byes (Total ${gladiators.length + seeds.length})`);

    // --- FASE A: ASIGNACIÓN ESTRATÉGICA (BYES) ---
    const byeSlots = findAvailableSlots(slots, 'BYE_SLOT', totalMatchesR1);
    byeSlots.sort((a, b) => b.priorityScore - a.priorityScore);

    for (const p of seeds) {
        const aid = p.student?.academy?.id ?? 0;
        for (const slot of byeSlots) {
            if (slot.participantId === null) {
                slot.participantId = p.id;
                slot.academyId = aid;
                break;
            }
        }
    }

    // --- FASE B: ASIGNACIÓN ESTRATÉGICA (COMBATES) ---
    const activeSlots = findAvailableSlots(slots, 'PLAY_IN', totalMatchesR1);
    
    // 4. Dispersar Academia Más Grande (Regla de Semifinal/Final)
    const largestAcademyFighters = gladiators.filter(p => (p.student?.academy?.id ?? 0) === largestAcademyId);
    
    for (const p of largestAcademyFighters) {
        let assigned = false;
        
        for (const slot of activeSlots.filter(s => s.participantId === null)) {
            const pairSlot = slots.get(`${slot.round}-${slot.matchNumber}-${slot.side === 'Akka' ? 'Ao' : 'Akka'}`);
            const targetOpponentAcademyId = pairSlot?.academyId ?? 0;
            
            if (!wouldViolateEarlyMatchRule(slots, slot, largestAcademyId, targetOpponentAcademyId)) {
                slot.participantId = p.id;
                slot.academyId = largestAcademyId;
                assigned = true;
                break;
            }
        }
        
        // Fallback: Asignar al primer slot activo disponible si no se puede cumplir la regla.
        if (!assigned) {
             const fallbackSlot = activeSlots.find(s => s.participantId === null);
             if (fallbackSlot) {
                fallbackSlot.participantId = p.id;
                fallbackSlot.academyId = largestAcademyId;
             }
        }
    }
    
    // 5. Llenar Slots Activos Restantes (Gladiadores sobrantes)
    const assignedIds = new Set(Array.from(slots.values()).map(s => s.participantId).filter(id => id !== null) as number[]);
    const remainingGladiatorsToAssign = gladiators.filter(p => !assignedIds.has(p.id));

    for (const p of remainingGladiatorsToAssign) {
        const aid = p.student?.academy?.id ?? 0;
        let assigned = false;
        
        for (const slot of activeSlots.filter(s => s.participantId === null)) {
            const pairSlot = slots.get(`${slot.round}-${slot.matchNumber}-${slot.side === 'Akka' ? 'Ao' : 'Akka'}`);
            const targetOpponentAcademyId = pairSlot?.academyId ?? 0;
            
            if (!wouldViolateEarlyMatchRule(slots, slot, aid, targetOpponentAcademyId)) {
                slot.participantId = p.id;
                slot.academyId = aid;
                assigned = true;
                break;
            }
        }
        
        // Fallback
        if (!assigned) {
             const fallbackSlot = activeSlots.find(s => s.participantId === null);
             if (fallbackSlot) {
                fallbackSlot.participantId = p.id;
                fallbackSlot.academyId = aid;
             }
        }
    }
    
    // 6. Generar Array Alineado (incluyendo NULLs)
    const alignedResult: (number | null)[] = [];
    for (let m = 1; m <= totalMatchesR1; m++) {
        const akka = slots.get(`1-${m}-Akka`);
        const ao = slots.get(`1-${m}-Ao`);
        
        alignedResult.push(akka?.participantId ?? null);
        alignedResult.push(ao?.participantId ?? null);
    }
    
    // VALIDACIÓN CRÍTICA
    const totalAssignedInSlots = Array.from(slots.values()).filter(s => s.participantId !== null).length;

    return { result: alignedResult, assignedCount: totalAssignedInSlots };
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

                    // 🛑 SELECCIÓN DE FASES: Ajustar el mapeo para usar solo las fases necesarias.
                    const sortedPhases = allPhases.sort((a, b) => a.order - b.order);
                    
                    if (sortedPhases.length < totalRounds) {
                         throw new Error(`Categoría ${category.code} requiere ${totalRounds} fases, solo hay ${sortedPhases.length}.`);
                    }

                    // Seleccionar solo las 'totalRounds' fases necesarias del FINAL de la lista.
                    const requiredPhases = sortedPhases.slice(sortedPhases.length - totalRounds);

                    // SEEDING INTELIGENTE
                    const { result: seededParticipants, assignedCount } = seedParticipantsWithSymmetry(participants, bracketSize);
                    
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
                                
                                if (seededParticipants[idxAkka]) newMatchData.participantAkkaId = seededParticipants[idxAkka] as number;
                                if (seededParticipants[idxAo]) newMatchData.participantAoId = seededParticipants[idxAo] as number;
                                
                                // LÓGICA DE BYE AUTOMÁTICO
                                if (newMatchData.participantAkkaId && !newMatchData.participantAoId) {
                                    newMatchData.winnerId = newMatchData.participantAkkaId;
                                    newMatchData.status = "Completado"; // Marca como completado para el pase
                                    
                                    const p = participants.find(x => x.id === newMatchData.participantAkkaId);
                                    console.log(`      ✅ Match ${i + 1}: ${p?.student?.firstname} avanza directo (BYE)`);
                                } 
                                else if (newMatchData.participantAkkaId && newMatchData.participantAoId) {
                                    const p1 = participants.find(x => x.id === newMatchData.participantAkkaId);
                                    const p2 = participants.find(x => x.id === newMatchData.participantAoId);
                                    console.log(`      ⚔️ Match ${i + 1}: ${p1?.student?.firstname} vs ${p2?.student?.firstname}`);
                                }
                            }
                            
                            const createdMatch = await tx.match.create({ data: newMatchData });
                            currentRoundMatches.push(createdMatch);
                        }
                        
                        // Conectar rondas
                        if (r > 0) { 
                            for (let i = 0; i < numMatchesInRound; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                // Necesitamos los matches de la ronda anterior (r-1)
                                const prevMatch1 = previousRoundMatches[i * 2];
                                const prevMatch2 = previousRoundMatches[i * 2 + 1];
                                
                                // 🛑 COMENTARIO: Lógica de promoción de BYE
                                // Si el match anterior está COMPLETO (es un BYE), promovemos el ganador inmediatamente
                                // al match actual, sin esperar a un evento. Esto corrige el error reportado.
                                
                                // Promover ganador del Match Anterior 1 (Lado Akka)
                                if (prevMatch1 && prevMatch1.status === "Completado" && prevMatch1.winnerId) {
                                    await tx.match.update({
                                        where: { id: currentMatchId },
                                        data: { participantAkka: { connect: { id: prevMatch1.winnerId } } }
                                    });
                                    console.log(`      ⬆️  BYE Promovido: ${prevMatch1.winnerId} -> Match ${currentMatchId} (Akka)`);
                                }
                                // Promover ganador del Match Anterior 2 (Lado Ao)
                                if (prevMatch2 && prevMatch2.status === "Completado" && prevMatch2.winnerId) {
                                     await tx.match.update({
                                        where: { id: currentMatchId },
                                        data: { participantAo: { connect: { id: prevMatch2.winnerId } } }
                                    });
                                     console.log(`      ⬆️  BYE Promovido: ${prevMatch2.winnerId} -> Match ${currentMatchId} (Ao)`);
                                }
                                
                                // Establecer Punteros nextMatchId (Lógica original de conexión)
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
                }
                
                return { message: `Brackets generados con sembrado adaptado y doble bronce.` };
            }, { timeout: 60000 });
            
        } catch (error) {
            console.error(`❌ ERROR BRACKETS:`, error);
            throw error;
        }
    }

    // =================================================================
    // MÉTODOS EXISTENTES CONSERVADOS INTACTOS
    // =================================================================

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