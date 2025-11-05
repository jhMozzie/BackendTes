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

// 💥 Helper para calcular la potencia de 2 INFERIOR más cercana
// Ejemplos: 5 -> 4, 9 -> 8, 13 -> 8, 14 -> 8, 4 -> 4, 8 -> 8
const lowerPowerOfTwo = (n: number) => {
    if (n <= 0) return 1;
    let p = 1;
    while (p * 2 <= n) {
        p <<= 1; // Equivalente a p *= 2
    }
    return p;
};

// -------------------------------------------------------------------
// 💥 ALGORITMO MEJORADO: Distribuir participantes para MINIMIZAR enfrentamientos misma academia
// -------------------------------------------------------------------
function distributeParticipantsOptimally(
    participantIds: number[],
    participantsMap: Map<number, ParticipantWithAcademy>
): number[] {
    // Estrategia: Colocar participantes de la misma academia lo más separados posible
    
    // 1. Agrupar por academia
    const academyGroups = new Map<number, number[]>();
    for (const pId of participantIds) {
        const p = participantsMap.get(pId);
        const academyId = p?.student?.academy?.id ?? 0;
        if (!academyGroups.has(academyId)) {
            academyGroups.set(academyId, []);
        }
        academyGroups.get(academyId)!.push(pId);
    }
    
    // 2. Ordenar grupos por tamaño (mayor primero) para distribuir mejor
    const sortedGroups = Array.from(academyGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`📊 Distribución de academias en Play-In:`);
    for (const [academyId, participants] of sortedGroups) {
        const academyName = participantsMap.get(participants[0])?.student?.academy?.name ?? 'Independiente';
        console.log(`   ${academyName}: ${participants.length} participantes`);
    }
    
    // 3. Crear array resultado - usar null para indicar vacío
    const result: (number | null)[] = new Array(participantIds.length).fill(null);
    
    // 4. Distribución estratégica: alternar entre posiciones pares e impares
    for (const [academyId, participants] of sortedGroups) {
        for (const pId of participants) {
            // Buscar la mejor posición disponible que no cree conflicto
            let bestPos = -1;
            let maxDistance = -1;
            
            for (let pos = 0; pos < result.length; pos++) {
                if (result[pos] !== null) continue; // Ya ocupada
                
                // Calcular distancia mínima a otro participante de la misma academia
                let minDist = result.length;
                for (let checkPos = 0; checkPos < result.length; checkPos++) {
                    if (result[checkPos] === null) continue;
                    const checkP = participantsMap.get(result[checkPos]!);
                    const checkAcademy = checkP?.student?.academy?.id ?? 0;
                    
                    if (checkAcademy === academyId && academyId !== 0) {
                        const dist = Math.abs(pos - checkPos);
                        minDist = Math.min(minDist, dist);
                    }
                }
                
                // Verificar que no cree conflicto directo (mismo match)
                const matchPairPos = pos % 2 === 0 ? pos + 1 : pos - 1;
                if (matchPairPos < result.length && result[matchPairPos] !== null) {
                    const pairP = participantsMap.get(result[matchPairPos]!);
                    const pairAcademy = pairP?.student?.academy?.id ?? 0;
                    if (pairAcademy === academyId && academyId !== 0) {
                        continue; // Esta posición crearía conflicto
                    }
                }
                
                if (minDist > maxDistance) {
                    maxDistance = minDist;
                    bestPos = pos;
                }
            }
            
            if (bestPos !== -1) {
                result[bestPos] = pId;
            } else {
                // Si no encontramos posición óptima, asignar a la primera disponible
                console.warn(`⚠️ No se encontró posición óptima para participante ${pId}, asignando a primera disponible`);
                const firstAvailable = result.findIndex(r => r === null);
                if (firstAvailable !== -1) {
                    result[firstAvailable] = pId;
                } else {
                    console.error(`❌ ERROR CRÍTICO: No hay posiciones disponibles para participante ${pId}`);
                }
            }
        }
    }
    
    // 5. Convertir nulls restantes a array final (no debería haber nulls)
    const finalResult = result.filter((id): id is number => id !== null);
    
    if (finalResult.length !== participantIds.length) {
        console.error(`❌ ERROR: Se perdieron participantes en distribución`);
        console.error(`   Esperados: ${participantIds.length}, Obtenidos: ${finalResult.length}`);
        // Fallback: retornar el array original
        return participantIds;
    }
    
    // 6. Validación final
    let conflicts = 0;
    for (let i = 0; i < finalResult.length - 1; i += 2) {
        const p1 = participantsMap.get(finalResult[i]);
        const p2 = participantsMap.get(finalResult[i + 1]);
        const academy1 = p1?.student?.academy?.id ?? 0;
        const academy2 = p2?.student?.academy?.id ?? 0;
        
        if (academy1 === academy2 && academy1 !== 0) {
            conflicts++;
            const p1Name = p1?.student ? `${p1.student.firstname} ${p1.student.lastname}` : 'Unknown';
            const p2Name = p2?.student ? `${p2.student.firstname} ${p2.student.lastname}` : 'Unknown';
            const academyName = p1?.student?.academy?.name ?? 'Unknown';
            console.error(`❌ CONFLICTO en Play-In match ${Math.floor(i/2) + 1}: ${p1Name} vs ${p2Name} (${academyName})`);
        }
    }
    
    if (conflicts === 0) {
        console.log(`✅ Distribución óptima: 0 conflictos en ${finalResult.length} participantes`);
    } else {
        console.warn(`⚠️ Distribución completada con ${conflicts} conflicto(s) - Academia dominante >50%`);
    }
    
    return finalResult;
}

// -------------------------------------------------------------------
// 💥 ALGORITMO DE SEEDING (Sorteo) CON RESTRICCIÓN DE ACADEMIA + ALEATORIZACIÓN
// -------------------------------------------------------------------
function seedParticipants(
    participants: ParticipantWithAcademy[],
    numByes: number,
    numToFight: number
): { participantsToFight: number[], participantsWithBye: number[] } {
    
    // 1. Agrupar por Academia
    const academyGroups = new Map<number, ParticipantWithAcademy[]>();
    
    for (const p of participants) {
        const academyId = p.student?.academy?.id ?? 0; // 0 para independientes
        if (!academyGroups.has(academyId)) {
            academyGroups.set(academyId, []);
        }
        academyGroups.get(academyId)!.push(p);
    }

    // 2. ALEATORIZAR participantes dentro de cada grupo de academia
    for (const group of academyGroups.values()) {
        for (let i = group.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [group[i], group[j]] = [group[j], group[i]];
        }
    }

    // 3. Crear arrays separados para BYEs y Fight
    const participantsWithBye: number[] = [];
    const participantsToFight: number[] = [];
    
    // 4. Convertir a array y ALEATORIZAR el orden de los grupos
    const groupsArray = Array.from(academyGroups.values())
        .map(group => [...group]); // Copiar para no modificar originales
    
    // Aleatorizar el orden de los grupos
    for (let i = groupsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [groupsArray[i], groupsArray[j]] = [groupsArray[j], groupsArray[i]];
    }
    
    // 5. Asignar BYEs distribuyendo entre grupos (round-robin con orden aleatorio)
    let byesAssigned = 0;
    while (byesAssigned < numByes) {
        for (const group of groupsArray) {
            if (byesAssigned < numByes && group.length > 0) {
                const participant = group.shift()!; // Remover del grupo
                participantsWithBye.push(participant.id);
                byesAssigned++;
            }
        }
    }
    
    // 6. Los restantes van a Play-In, distribuyendo alternadamente
    let fightAssigned = 0;
    while (fightAssigned < numToFight) {
        for (const group of groupsArray) {
            if (fightAssigned < numToFight && group.length > 0) {
                const participant = group.shift()!; // Remover del grupo
                participantsToFight.push(participant.id);
                fightAssigned++;
            }
        }
    }
    
    // 7. Distribución óptima para evitar misma academia
    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const optimizedFights = distributeParticipantsOptimally(participantsToFight, participantsMap);
    
    // 8. Validación: asegurar que todos los participantes están asignados
    const total = participantsWithBye.length + optimizedFights.length;
    if (total !== participants.length) {
        console.error(`❌ Seeding ERROR: Expected ${participants.length} participants, got ${total}`);
        console.error(`   BYEs: ${participantsWithBye.length}, Fight: ${optimizedFights.length}`);
        console.error(`   Missing: ${participants.length - total} participants`);
    }

    return { participantsToFight: optimizedFights, participantsWithBye };
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
            
            // 🆕 PASO 0: Eliminar matches existentes del campeonato antes de regenerar
            await tx.match.deleteMany({
                where: {
                    championshipCategory: {
                        championshipId: championshipId
                    }
                }
            });
            
            for (const category of categories) {
                const participants = category.participants as ParticipantWithAcademy[];
                const numParticipants = participants.length;

                if (numParticipants < 2) continue;

                // 1. Calcular estructura del bracket con Play-In
                // bracketSize = potencia de 2 inferior (4, 8, 16, 32...)
                // Los "extras" pelean en Play-In, el resto pasa directo (BYE)
                const bracketSize = lowerPowerOfTwo(numParticipants);
                const totalRoundsInMainBracket = Math.log2(bracketSize);
                
                // Cálculo de Play-In
                // Ejemplo 5 participantes: bracketSize=4, extras=1, toFight=2, byes=3
                // Ejemplo 14 participantes: bracketSize=8, extras=6, toFight=12, byes=2
                const numExtras = numParticipants - bracketSize;
                const numToFight = numExtras * 2; // El doble de los extras pelean en Play-In
                const numByes = numParticipants - numToFight; // El resto pasa directo
                const numPlayInMatches = numExtras; // Cada extra genera 1 match de Play-In
                
                const totalPhases = totalRoundsInMainBracket + (numPlayInMatches > 0 ? 1 : 0);

                
                // 2. Obtener los slots de Seeding (distribuir participantes)
                const { participantsToFight, participantsWithBye } = seedParticipants(participants, numByes, numToFight);
                
                let previousRoundMatches: any[] = []; 

                // 3. Iterar desde la Ronda 1 (Play-In si existe) hasta la Final
                for (let r = 1; r <= totalPhases; r++) {
                    const phase = allPhases.find(p => p.order === r);
                    if (!phase) throw new Error(`Fase con orden ${r} no encontrada.`);

                    // Cálculo de combates por ronda
                    let numMatchesInRound = 0;
                    if (r === 1 && numPlayInMatches > 0) {
                        // Ronda 1: Play-In (si hay extras)
                        numMatchesInRound = numPlayInMatches;
                    } else {
                        // Rondas del bracket principal
                        // Si hay Play-In: r=2 es la primera del bracket (bracketSize/2 matches)
                        // Si NO hay Play-In: r=1 es la primera del bracket
                        const bracketRound = numPlayInMatches > 0 ? r - 1 : r;
                        numMatchesInRound = bracketSize / Math.pow(2, bracketRound);
                    }
                    
                    const currentRoundMatches: any[] = [];
                    let fightIdx = 0;
                    
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

                        // 4. Asignar participantes en Play-In (r=1 con Play-In)
                        if (r === 1 && numPlayInMatches > 0) {
                            if (fightIdx < participantsToFight.length - 1) {
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
                        // 5.A Si la ronda anterior fue Play-In
                        if (r === 2 && numPlayInMatches > 0) {
                            // Distribuir matches de Play-In entre los matches de la siguiente ronda
                            // Ejemplo: 6 Play-In → 4 Cuartos
                            // - Primeros N matches van a Akka de los primeros N cuartos
                            // - Los restantes se distribuyen en Ao de los últimos matches
                            
                            const numBracketMatches = numMatchesInRound;
                            let playInIdx = 0;
                            
                            // Primera pasada: Llenar slots Akka con Play-In
                            for (let i = 0; i < Math.min(numBracketMatches, previousRoundMatches.length); i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                const prevMatch = previousRoundMatches[playInIdx];
                                
                                await tx.match.update({ 
                                    where: { id: prevMatch.id }, 
                                    data: { nextMatchId: currentMatchId, nextMatchSide: 'Akka' } 
                                });
                                playInIdx++;
                            }
                            
                            // Segunda pasada: Distribuir matches restantes de Play-In en slots Ao
                            // Empezar desde el final del bracket hacia atrás
                            let aoSlotIdx = numBracketMatches - 1;
                            while (playInIdx < previousRoundMatches.length && aoSlotIdx >= 0) {
                                const currentMatchId = currentRoundMatches[aoSlotIdx].id;
                                const prevMatch = previousRoundMatches[playInIdx];
                                
                                await tx.match.update({ 
                                    where: { id: prevMatch.id }, 
                                    data: { nextMatchId: currentMatchId, nextMatchSide: 'Ao' } 
                                });
                                playInIdx++;
                                aoSlotIdx--;
                            }
                        } 
                        // 5.B Rondas normales del bracket (conectar 2 a 1)
                        else if (r > 2 || (r === 2 && numPlayInMatches === 0)) {
                            for (let i = 0; i < numMatchesInRound; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                const prevMatch1 = previousRoundMatches[i * 2];
                                const prevMatch2 = previousRoundMatches[i * 2 + 1];
                                
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
                        
                        // 6. Asignar BYEs a la primera ronda del bracket principal
                        if (r === 2 && numPlayInMatches > 0) {
                            // Ejemplo con 11 participantes:
                            // - bracketSize=8, extras=3, toFight=6 (3 Play-In), byes=5
                            // - Octavos (r=2): 4 matches
                            // - Play-In winners: 3
                            // - BYEs: 5
                            // Distribución:
                            // - Match 1: Play-In 1 (Akka) vs BYE 1 (Ao)
                            // - Match 2: Play-In 2 (Akka) vs BYE 2 (Ao)
                            // - Match 3: Play-In 3 (Akka) vs BYE 3 (Ao)
                            // - Match 4: BYE 4 (Akka) vs BYE 5 (Ao)
                            
                            const numBracketMatches = numMatchesInRound;
                            const numPlayInWinners = previousRoundMatches.length;
                            
                            let byeIdx = 0;
                            
                            // Primero: Asignar BYEs en slots Ao de matches con Play-In en Akka
                            for (let i = 0; i < Math.min(numBracketMatches, numPlayInWinners) && byeIdx < participantsWithBye.length; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                
                                await tx.match.update({
                                    where: { id: currentMatchId },
                                    data: {
                                        participantAo: { connect: { id: participantsWithBye[byeIdx]! } }
                                    }
                                });
                                byeIdx++;
                            }
                            
                            // Segundo: Si quedan BYEs, llenar matches restantes (sin Play-In)
                            for (let i = numPlayInWinners; i < numBracketMatches && byeIdx < participantsWithBye.length; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                const updateData: Prisma.MatchUpdateInput = {};
                                
                                // Asignar BYE en Akka
                                if (byeIdx < participantsWithBye.length) {
                                    updateData.participantAkka = { connect: { id: participantsWithBye[byeIdx]! } };
                                    byeIdx++;
                                }
                                
                                // Asignar BYE en Ao
                                if (byeIdx < participantsWithBye.length) {
                                    updateData.participantAo = { connect: { id: participantsWithBye[byeIdx]! } };
                                    byeIdx++;
                                }
                                
                                // Si solo hay un participante, gana automáticamente
                                if (updateData.participantAkka && !updateData.participantAo) {
                                    updateData.winner = updateData.participantAkka;
                                    updateData.status = "Completado";
                                }
                                
                                if (Object.keys(updateData).length > 0) {
                                    await tx.match.update({
                                        where: { id: currentMatchId },
                                        data: updateData
                                    });
                                }
                            }
                            
                            console.log(`📊 Categoría ${category.code}: ${numParticipants} participantes`);
                            console.log(`   Play-In: ${numPlayInMatches} matches (${numToFight} participantes)`);
                            console.log(`   BYEs: ${participantsWithBye.length} asignados`);
                        }
                        // Si NO hay Play-In, los BYEs van a la primera ronda (r=1)
                        else if (r === 1 && numPlayInMatches === 0) {
                            let byeIdx = 0;
                            for (let i = 0; i < numMatchesInRound; i++) {
                                const currentMatchId = currentRoundMatches[i].id;
                                const updatePayload: Prisma.MatchUpdateInput = {};
                                
                                // Asignar participantes con BYE
                                if (byeIdx < participantsWithBye.length) {
                                    updatePayload.participantAkka = { connect: { id: participantsWithBye[byeIdx]! } };
                                    byeIdx++;
                                }
                                if (byeIdx < participantsWithBye.length) {
                                    updatePayload.participantAo = { connect: { id: participantsWithBye[byeIdx]! } };
                                    byeIdx++;
                                }

                                // Si solo un lado tiene participante, ese gana automáticamente
                                if (updatePayload.participantAkka && !updatePayload.participantAo) {
                                    updatePayload.winner = updatePayload.participantAkka;
                                    updatePayload.status = "Completado";
                                }

                                if (Object.keys(updatePayload).length > 0) {
                                    await tx.match.update({
                                        where: { id: currentMatchId },
                                        data: updatePayload
                                    });
                                }
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
            championshipCategory: {
                select: {
                    id: true,
                    code: true,
                    modality: true,  // ← CRÍTICO: Kata o Kumite
                    gender: true,
                    weight: true,
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

    /**
     * Actualiza el marcador de un combate y determina automáticamente el ganador.
     * El ganador es quien tenga el score más alto.
     */
    async updateMatchScore(matchId: number, scoreAkka: number, scoreAo: number) {
        // 1. Obtener el match para saber quiénes son los participantes
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

        // 2. Determinar el ganador basándose en los scores
        let winnerId: number;
        if (scoreAkka > scoreAo) {
            winnerId = match.participantAkkaId;
        } else if (scoreAo > scoreAkka) {
            winnerId = match.participantAoId;
        } else {
            throw new Error("No puede haber empate. Los scores deben ser diferentes.");
        }

        // 3. Actualizar el match con scores, ganador y estado "Completado"
        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
                scoreAkka: scoreAkka,
                scoreAo: scoreAo,
                winnerId: winnerId,
                status: "Completado"
            }
        });

        // 4. Promover al ganador al siguiente match (si existe)
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