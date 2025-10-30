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

// 💥 CORRECCIÓN: Helper para calcular la potencia de 2 INFERIOR (ej: 5 -> 4, 9 -> 8)
const lowerPowerOfTwo = (n: number) => {
    let p = 1;
    while (p * 2 <= n) {
        p <<= 1;
    }
    return p;
};

// -------------------------------------------------------------------
// 💥 ALGORITMO DE SEEDING (Sorteo) CON RESTRICCIÓN DE ACADEMIA
// -------------------------------------------------------------------
function seedParticipants(
    participants: ParticipantWithAcademy[],
    numByes: number,
    numToFight: number
): { participantsToFight: number[], participantsWithBye: number[] } {
    
    // 1. Agrupar por Academia
    const academyGroups = new Map<number, number[]>(); // Key: AcademyID, Value: ParticipantID[]
    
    const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());

    for (const p of shuffledParticipants) {
        const academyId = p.student?.academy?.id ?? 0; // 0 para independientes
        if (!academyGroups.has(academyId)) {
            academyGroups.set(academyId, []);
        }
        academyGroups.get(academyId)!.push(p.id);
    }

    // 2. Ordenar grupos: de más grande a más pequeño
    const sortedGroups = Array.from(academyGroups.values()).sort((a, b) => b.length - a.length);

    // 3. Asignar BYEs (a los grupos más grandes primero)
    const participantsWithBye: number[] = [];
    let byesAssigned = 0;
    
    while (byesAssigned < numByes) {
        for (const group of sortedGroups) {
            if (byesAssigned < numByes && group.length > 0) {
                participantsWithBye.push(group.pop()!);
                byesAssigned++;
            }
        }
    }
    
    // 4. Asignar los que SÍ combaten (P vs P)
    // 💥 APLICAR RESTRICCIÓN DE ACADEMIA (Simplificado)
    // (Esta lógica aún debe mejorarse para garantizar la separación en el Play-In)
    const participantsToFight = sortedGroups.flat().sort(() => 0.5 - Math.random()); 

    return { participantsToFight, participantsWithBye };
}


export class MatchService {
    
    /**
     * GENERA BRACKETS: Crea todas las rondas y las conecta (Lógica Play-In)
     */
    async generateBrackets(payload: GenerateBracketsPayload) {
        const { championshipId } = payload;
        
        const allPhases = await phaseService.getAll();
        const categories = await prisma.championshipCategory.findMany({
            where: { championshipId: championshipId },
            include: {
                participants: {
                    include: { student: { include: { academy: true } } },
                }
            }
        });

        if (allPhases.length === 0) {
            throw new Error("No se han definido fases de torneo (Phase).");
        }
        
        return prisma.$transaction(async (tx) => {
            
            for (const category of categories) {
                const participants = category.participants as ParticipantWithAcademy[];
                const numParticipants = participants.length;

                if (numParticipants < 2) continue;

                // 1. Calcular estructura del Play-In
                const bracketSize = lowerPowerOfTwo(numParticipants); // Ej: 5 -> 4. Ej: 9 -> 8.
                const totalRoundsInMainBracket = Math.log2(bracketSize); // Ej: 4 -> 2 Rondas (Semi, Final)
                const totalPhases = totalRoundsInMainBracket + 1; // 1 (Play-In) + 2 (Main) = 3 Fases

                const numToFight = (numParticipants - bracketSize) * 2; // Ej: (5-4)*2=2. Ej: (9-8)*2=2.
                const numByes = numParticipants - numToFight; // Ej: 5-2=3. Ej: 9-2=7.
                const numPlayInMatches = numToFight / 2; // Ej: 2/2=1.

                
                // 2. Obtener los slots de Seeding (BYEs y Play-In)
                const { participantsToFight, participantsWithBye } = seedParticipants(participants, numByes, numToFight);
                
                let previousRoundMatches: any[] = []; 
                let matchesToPromote: (number | null)[] = participantsWithBye; // Ganadores directos (BYE)

                // 3. Iterar desde la Ronda 1 (Play-In) hasta la Final
                for (let r = 1; r <= totalPhases; r++) {
                    const phase = allPhases.find(p => p.order === r);
                    if (!phase) throw new Error(`Fase con orden ${r} no encontrada.`);

                    // 💥 Cálculo de combates por ronda
                    let numMatchesInRound = 0;
                    if (r === 1) {
                        numMatchesInRound = numPlayInMatches; // Ronda 1 (Play-In)
                    } else {
                        // Rondas 2 en adelante
                        numMatchesInRound = bracketSize / Math.pow(2, r-1); 
                    }
                    
                    const currentRoundMatches: any[] = [];
                    let fightIdx = 0; // Índice para los que pelean en Play-In (Ronda 1)
                    
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

                        // 4. Asignar participantes
                        if (r === 1) {
                            // Ronda 1: Llenar solo los combates de Play-In
                            if (fightIdx < participantsToFight.length) {
                                newMatchData.participantAkkaId = participantsToFight[fightIdx];
                                newMatchData.participantAoId = participantsToFight[fightIdx + 1];
                                fightIdx += 2;
                            }
                        }
                        
                        const createdMatch = await tx.match.create({
                            data: newMatchData
                        });
                        currentRoundMatches.push(createdMatch);
                    }
                    
                    // 5. Conectar la ronda anterior con la ronda actual
                    if (r > 1) { 
                        let byeIdx = 0; // Índice para los que pasaron por BYE

                        for (let i = 0; i < numMatchesInRound; i++) {
                            const currentMatchId = currentRoundMatches[i].id;
                            
                            // 5.A. Conectar ganadores de Play-In (Ronda 1 -> Ronda 2)
                            if (r === 2 && i < previousRoundMatches.length) {
                                const prevMatch = previousRoundMatches[i];
                                await tx.match.update({
                                    where: { id: prevMatch.id },
                                    data: { nextMatchId: currentMatchId, nextMatchSide: 'Akka' }
                                });
                            } 
                            // 5.B. Conectar ganadores de Rondas Superiores (Ronda 2 -> 3, etc.)
                            else if (r > 2) {
                                const prevMatch1 = previousRoundMatches[i * 2];
                                const prevMatch2 = previousRoundMatches[i * 2 + 1];
                                await tx.match.update({ where: { id: prevMatch1.id }, data: { nextMatchId: currentMatchId, nextMatchSide: 'Akka' } });
                                await tx.match.update({ where: { id: prevMatch2.id }, data: { nextMatchId: currentMatchId, nextMatchSide: 'Ao' } });
                            }

                            // 6. Promover ganadores de BYE (Solo a Ronda 2)
                            if (r === 2) {
                                const updatePayload: Prisma.MatchUpdateInput = {};
                                
                                // El slot Akka ya fue llenado por el Play-In (si existe)
                                if (i >= previousRoundMatches.length && byeIdx < matchesToPromote.length) {
                                    updatePayload.participantAkka = { connect: { id: matchesToPromote[byeIdx]! } };
                                    byeIdx++;
                                }
                                
                                // Llenar el slot Ao con BYE
                                if (byeIdx < matchesToPromote.length) {
                                    updatePayload.participantAo = { connect: { id: matchesToPromote[byeIdx]! } };
                                    byeIdx++;
                                }

                                // Si ambos lados se llenaron con BYEs, el 1ro gana (simulación)
                                if (updatePayload.participantAkka && !updatePayload.participantAo) {
                                    updatePayload.winner = updatePayload.participantAkka;
                                    updatePayload.status = "Completado";
                                }
                                if (!updatePayload.participantAkka && updatePayload.participantAo) {
                                    updatePayload.winner = updatePayload.participantAo;
                                    updatePayload.status = "Completado";
                                }

                                await tx.match.update({
                                    where: { id: currentMatchId },
                                    data: updatePayload
                                });
                            }
                        }
                    }
                    
                    previousRoundMatches = currentRoundMatches;
                }
            }
            
            return { message: `Brackets generados exitosamente.` };
        });
    }


    /**
     * Obtiene los brackets (lista de combates) de una categoría.
     */
    async getBracketsByCategory(championshipCategoryId: number): Promise<MatchDetails[]> {
        
        const bracketInclude = {
            phase: { select: { description: true, order: true } },
            participantAkka: {
                include: {
                    student: { 
                        select: {
                            firstname: true,
                            lastname: true,
                            academy: { select: { name: true } }
                        }
                    }
                }
            },
            participantAo: {
                include: {
                    student: {
                        select: {
                            firstname: true,
                            lastname: true,
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
     * Actualiza el ganador de un combate y promueve al ganador.
     */
    async updateMatchWinner(matchId: number, payload: UpdateMatchWinnerPayload) {
        
        const { winnerId, scoreAkka, scoreAo } = payload;
        
        // 1. Actualizar el combate actual (Ganador y Score)
        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
                winnerId: winnerId,
                status: "Completado",
                scoreAkka: scoreAkka,
                scoreAo: scoreAo
            }
        });

        // 2. Promover al ganador (si hay un siguiente combate)
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
}