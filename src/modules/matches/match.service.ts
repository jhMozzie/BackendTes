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
// 💥 ALGORITMO DE SEEDING SIMÉTRICO CON POOLS (Minimiza enfrentamientos de misma academia)
// -------------------------------------------------------------------

/**
 * Agrupa participantes por academia
 */
function groupByAcademy(participants: ParticipantWithAcademy[]): Map<number, ParticipantWithAcademy[]> {
    const academyGroups = new Map<number, ParticipantWithAcademy[]>();
    
    for (const p of participants) {
        const academyId = p.student?.academy?.id ?? 0; // 0 para independientes
        if (!academyGroups.has(academyId)) {
            academyGroups.set(academyId, []);
        }
        academyGroups.get(academyId)!.push(p);
    }
    
    return academyGroups;
}

/**
 * Ordena grupos de academia por tamaño (mayor a menor)
 */
function sortBySize(academyGroups: Map<number, ParticipantWithAcademy[]>): [number, ParticipantWithAcademy[]][] {
    return Array.from(academyGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);
}

/**
 * Encuentra la mejor posición en un pool maximizando distancia a compañeros de academia
 */
function findBestPosition(
    pool: (number | null)[],
    academyId: number,
    participantsMap: Map<number, ParticipantWithAcademy>
): number {
    // Estrategia: Buscar posición con máxima distancia a otros de misma academia
    let bestPos = -1;
    let maxMinDistance = -1;
    
    for (let pos = 0; pos < pool.length; pos++) {
        if (pool[pos] !== null) continue; // Posición ocupada
        
        // Calcular distancia mínima a otros de misma academia
        let minDist = pool.length;
        for (let checkPos = 0; checkPos < pool.length; checkPos++) {
            if (pool[checkPos] === null) continue;
            const checkParticipant = participantsMap.get(pool[checkPos]!);
            if (checkParticipant?.student?.academy?.id === academyId && academyId !== 0) {
                minDist = Math.min(minDist, Math.abs(pos - checkPos));
            }
        }
        
        if (minDist > maxMinDistance) {
            maxMinDistance = minDist;
            bestPos = pos;
        }
    }
    
    // Si no encontramos posición óptima, usar primera disponible
    return bestPos !== -1 ? bestPos : pool.findIndex(p => p === null);
}

/**
 * Seeding con simetría: Divide participantes en dos pools (A y B) balanceados
 * REGLA CLAVE: Participantes de la misma academia deben estar en POOLS OPUESTOS
 * para que solo se enfrenten en semifinal o final (nunca en primera ronda)
 */
function seedWithSymmetry(
    participants: ParticipantWithAcademy[],
    bracketSize: number
): { poolA: number[], poolB: number[] } {
    
    // 1. Agrupar por academia y ordenar por cantidad (mayor a menor)
    const academyGroups = groupByAcademy(participants);
    const sortedAcademies = sortBySize(academyGroups);
    
    console.log(`📊 Distribución de academias en seeding:`);
    for (const [academyId, students] of sortedAcademies) {
        const academyName = students[0]?.student?.academy?.name ?? 'Independiente';
        console.log(`   ${academyName}: ${students.length} participantes`);
    }
    
    // 2. Calcular slots por pool (división simétrica)
    const totalParticipants = participants.length;
    const poolASize = Math.ceil(totalParticipants / 2);
    const poolBSize = Math.floor(totalParticipants / 2);
    
    const poolA: number[] = [];
    const poolB: number[] = [];
    
    // 3. ESTRATEGIA SERPENTINA: Alternar academias entre pools
    // Esto garantiza que cada academia tenga participantes en ambos pools
    // y evita enfrentamientos de misma academia en primera ronda
    
    let toPoolA = true; // Empezar asignando a Pool A
    
    for (const [academyId, students] of sortedAcademies) {
        const count = students.length;
        
        // Si la academia tiene varios participantes, dividirlos entre pools
        if (count > 1) {
            const halfCount = Math.ceil(count / 2);
            
            // Primera mitad al pool actual
            for (let i = 0; i < halfCount; i++) {
                if (toPoolA && poolA.length < poolASize) {
                    poolA.push(students[i].id);
                } else if (!toPoolA && poolB.length < poolBSize) {
                    poolB.push(students[i].id);
                } else {
                    // Si el pool está lleno, cambiar al otro
                    if (poolA.length < poolASize) {
                        poolA.push(students[i].id);
                    } else {
                        poolB.push(students[i].id);
                    }
                }
            }
            
            // Segunda mitad al pool opuesto
            for (let i = halfCount; i < count; i++) {
                if (!toPoolA && poolB.length < poolBSize) {
                    poolB.push(students[i].id);
                } else if (toPoolA && poolA.length < poolASize) {
                    poolA.push(students[i].id);
                } else {
                    // Si el pool está lleno, usar el otro
                    if (poolB.length < poolBSize) {
                        poolB.push(students[i].id);
                    } else {
                        poolA.push(students[i].id);
                    }
                }
            }
        } else {
            // Si solo hay 1 participante, asignar alternando pools
            if (toPoolA && poolA.length < poolASize) {
                poolA.push(students[0].id);
            } else if (!toPoolA && poolB.length < poolBSize) {
                poolB.push(students[0].id);
            } else {
                // Usar el pool que tenga espacio
                if (poolA.length < poolASize) {
                    poolA.push(students[0].id);
                } else {
                    poolB.push(students[0].id);
                }
            }
        }
        
        // Alternar pool para la siguiente academia
        toPoolA = !toPoolA;
    }
    
    console.log(`   ✅ Pool A (${poolA.length}): [${poolA.join(', ')}]`);
    console.log(`   ✅ Pool B (${poolB.length}): [${poolB.join(', ')}]`);
    
    // 4. Validar distribución: Verificar que no haya academias con todos en un solo pool
    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const academyInPoolA = new Map<number, number>();
    const academyInPoolB = new Map<number, number>();
    
    for (const pId of poolA) {
        const p = participantsMap.get(pId);
        const academyId = p?.student?.academy?.id ?? 0;
        academyInPoolA.set(academyId, (academyInPoolA.get(academyId) || 0) + 1);
    }
    
    for (const pId of poolB) {
        const p = participantsMap.get(pId);
        const academyId = p?.student?.academy?.id ?? 0;
        academyInPoolB.set(academyId, (academyInPoolB.get(academyId) || 0) + 1);
    }
    
    console.log(`   📋 Verificación de distribución:`);
    for (const [academyId, students] of academyGroups.entries()) {
        const academyName = students[0]?.student?.academy?.name ?? 'Independiente';
        const inA = academyInPoolA.get(academyId) || 0;
        const inB = academyInPoolB.get(academyId) || 0;
        console.log(`      ${academyName}: Pool A=${inA}, Pool B=${inB}`);
        
        if (students.length > 1 && (inA === 0 || inB === 0)) {
            console.warn(`      ⚠️ ${academyName} tiene todos sus participantes en un solo pool!`);
        }
    }
    
    return { poolA, poolB };
}

// -------------------------------------------------------------------
// 💥 ALGORITMO DE SEEDING (Sorteo) CON RESTRICCIÓN DE ACADEMIA + ALEATORIZACIÓN
// -------------------------------------------------------------------
function seedParticipants(
    participants: ParticipantWithAcademy[],
    numByes: number,
    numToFight: number,
    bracketSize: number
): { participantsToFight: number[], participantsWithBye: number[] } {
    
    console.log(`\n🎲 SEEDING: ${participants.length} participantes, BYEs: ${numByes}, Play-In: ${numToFight}`);
    
    // CASO 1: Bracket perfecto (potencia de 2) - usar seeding simétrico con pools
    if (numToFight === 0 && numByes === participants.length) {
        console.log(`✨ Usando seeding SIMÉTRICO (bracket perfecto de ${bracketSize})`);
        
        const { poolA, poolB } = seedWithSymmetry(participants, bracketSize);
        
        // Intercalar pools: [A1, B1, A2, B2, A3, B3, ...]
        // Esto garantiza que Pool A juega contra Pool B en primera ronda
        const participantsWithBye: number[] = [];
        const maxLength = Math.max(poolA.length, poolB.length);
        
        for (let i = 0; i < maxLength; i++) {
            if (i < poolA.length) participantsWithBye.push(poolA[i]);
            if (i < poolB.length) participantsWithBye.push(poolB[i]);
        }
        
        console.log(`   Pool A (${poolA.length}): [${poolA.join(', ')}]`);
        console.log(`   Pool B (${poolB.length}): [${poolB.join(', ')}]`);
        console.log(`   Intercalado: [${participantsWithBye.join(', ')}]`);
        
        return { participantsToFight: [], participantsWithBye };
    }
    
    // CASO 2: Bracket con Play-In (no es potencia de 2) - usar algoritmo anterior
    console.log(`🔄 Usando seeding ROUND-ROBIN (con Play-In)`);
    
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
    
    // 7. Distribución óptima para evitar misma academia en Play-In
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
                console.log(`\n📋 Categoría ${category.code || category.id}:`);
                console.log(`   Total participantes: ${numParticipants}`);
                console.log(`   Bracket size: ${bracketSize}`);
                console.log(`   Extras (Play-In): ${numExtras}`);
                
                const { participantsToFight, participantsWithBye } = seedParticipants(
                    participants, 
                    numByes, 
                    numToFight, 
                    bracketSize
                );
                
                console.log(`   ✅ Con BYE: ${numByes} → IDs: [${participantsWithBye.join(', ')}]`);
                console.log(`   ✅ A pelear Play-In: ${numToFight} → IDs: [${participantsToFight.join(', ')}]`);
                
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
                    
                    // 4B. Si NO hay Play-In y es la primera ronda, asignar participantes directamente
                    if (r === 1 && numPlayInMatches === 0) {
                        console.log(`📊 Categoría ${category.code || category.id}: Asignando ${participantsWithBye.length} participantes directos (sin Play-In)`);
                        console.log(`   Matches en ronda 1: ${numMatchesInRound}`);
                        console.log(`   Array participantsWithBye completo:`, participantsWithBye);
                        
                        let byeIdx = 0;
                        for (let i = 0; i < numMatchesInRound; i++) {
                            const currentMatchId = currentRoundMatches[i].id;
                            const updatePayload: Prisma.MatchUpdateInput = {};
                            
                            // Asignar participantes con BYE
                            if (byeIdx < participantsWithBye.length) {
                                updatePayload.participantAkka = { connect: { id: participantsWithBye[byeIdx]! } };
                                console.log(`     Match ${i+1}: Akka = Participant ID ${participantsWithBye[byeIdx]}`);
                                byeIdx++;
                            }
                            if (byeIdx < participantsWithBye.length) {
                                updatePayload.participantAo = { connect: { id: participantsWithBye[byeIdx]! } };
                                console.log(`     Match ${i+1}: Ao = Participant ID ${participantsWithBye[byeIdx]}`);
                                byeIdx++;
                            }

                            // Si solo un lado tiene participante, ese gana automáticamente
                            if (updatePayload.participantAkka && !updatePayload.participantAo) {
                                updatePayload.winner = updatePayload.participantAkka;
                                updatePayload.status = "Completado";
                                console.log(`     Match ${i+1}: Auto-win (solo un participante)`);
                            }

                            if (Object.keys(updatePayload).length > 0) {
                                await tx.match.update({
                                    where: { id: currentMatchId },
                                    data: updatePayload
                                });
                            } else {
                                console.warn(`     ⚠️ Match ${i+1}: No se asignaron participantes!`);
                            }
                        }
                        
                        if (byeIdx < participantsWithBye.length) {
                            console.warn(`   ⚠️ Quedaron ${participantsWithBye.length - byeIdx} participantes sin asignar!`);
                        }
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
         * Devuelve el podio (1ro, 2do, 3ro(s)) de una categoría.
         * Retorna { gold, silver, bronze: [] } donde cada entrada puede ser null o un array vacío.
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

            // Helper para obtener datos del participante -> student + academy
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
                    academy: participant.student.academy ? { id: participant.student.academy.id, name: participant.student.academy.name } : null
                };
            };

            // ORO
            const gold = await getStudentInfo(finalMatch.winnerId as number);

            // PLATA: el otro participante del match final (si existe)
            let silver = null;
            const akka = finalMatch.participantAkkaId;
            const ao = finalMatch.participantAoId;
            if (akka && ao) {
                const loserId = (finalMatch.winnerId === akka) ? ao : akka;
                silver = await getStudentInfo(loserId as number);
            }

            // BRONCE: buscar match(es) cuya fase tenga 'Bronce' en la descripción
            const bronzeMatches = await prisma.match.findMany({
                where: {
                    championshipCategoryId,
                    winnerId: { not: null },
                    phase: { description: { contains: 'Bronce', mode: 'insensitive' } }
                },
                include: { phase: true }
            });

            let bronze: Array<any> = [];

            if (bronzeMatches.length > 0) {
                // Puede haber 1 o 2 matches de bronce
                for (const bm of bronzeMatches) {
                    const bWinner = await getStudentInfo(bm.winnerId as number);
                    if (bWinner) bronze.push(bWinner);
                }
            } else {
                // Si no hay match de bronce, usar los perdedores de semifinales como terceros lugares
                // Encontrar la fase semifinal (order = finalOrder - 1)
                const finalOrder = finalMatch.phase?.order ?? 0;
                const semiOrder = finalOrder > 0 ? finalOrder - 1 : 0;

                if (semiOrder > 0) {
                    const semis = await prisma.match.findMany({
                        where: { championshipCategoryId, phase: { order: semiOrder }, winnerId: { not: null } },
                        include: { phase: true }
                    });

                    for (const sm of semis) {
                        // El perdedor es el participante que NO sea winner
                        const loserId = (sm.participantAkkaId === sm.winnerId) ? sm.participantAoId : sm.participantAkkaId;
                        const loserInfo = await getStudentInfo(loserId as number);
                        if (loserInfo) bronze.push(loserInfo);
                    }
                }
            }

            return { gold, silver, bronze };
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