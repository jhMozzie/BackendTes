// src/modules/matches/match.service.ts

import {
  PrismaClient,
  Prisma,
  Participant,
  Student,
  Academy,
  Phase,
} from "@prisma/client";
import type {
  GenerateBracketsPayload,
  MatchDetails,
  UpdateMatchWinnerPayload,
} from "./match.types";
import { PhaseService } from "../phases/phase.service";

const prisma = new PrismaClient();
const phaseService = new PhaseService();

type ParticipantWithAcademy = Participant & {
  student: (Student & { academy: Academy | null }) | null;
};

const upperPowerOfTwo = (n: number): number => {
  if (n <= 0) return 1;
  if (n <= 2) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

function wouldViolateEarlyMatchRule(
  academyIdA: number,
  academyIdB: number
): boolean {
  if (academyIdA === 0 || academyIdB === 0) return false;
  return academyIdA === academyIdB;
}

function getParticipantAcademyId(participant: ParticipantWithAcademy): number {
  return participant.student?.academy?.id ?? 0;
}

/**
 * Helper para obtener academia por ID de participante
 */
function getParticipantAcademyIdById(
  participantId: number | null,
  participants: ParticipantWithAcademy[]
): number {
  if (participantId === null) return 0;
  const participant = participants.find((p) => p.id === participantId);
  return participant?.student?.academy?.id ?? 0;
}

/**
 * 🧠 LÓGICA PRINCIPAL MEJORADA: Distribución Estratégica + Anti-Choque
 *
 * BASADO EN codigobueno2.txt que SÍ respetaba las reglas anti-choque correctamente
 *
 * REGLAS DE NEGOCIO:
 * 1. Evitar choques de misma academia en R1, EXCEPTO si una academia supera el 50% del total
 * 2. Distribución simétrica: cada academia debe tener cantidad similar de participantes en upper/lower
 */
function seedParticipants(
  participants: ParticipantWithAcademy[],
  tournamentSize: number
): { result: (number | null)[]; assignedCount: number } {
  const numParticipants = participants.length;
  const numByes = tournamentSize - numParticipants;
  const halfSize = tournamentSize / 2;

  console.log(
    `🎯 Sembrado: ${numParticipants} participantes, ${tournamentSize} slots, ${numByes} BYEs`
  );

  // 1. AGRUPAR POR ACADEMIA Y ORDENAR
  const academyGroups = new Map<number, ParticipantWithAcademy[]>();
  for (const p of participants) {
    const aid = getParticipantAcademyId(p);
    if (!academyGroups.has(aid)) academyGroups.set(aid, []);
    academyGroups.get(aid)!.push(p);
  }

  const sortedAcademies = Array.from(academyGroups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Crear lista priorizada (academias grandes primero)
  const prioritizedParticipants: ParticipantWithAcademy[] = [];
  for (const [_, arr] of sortedAcademies) {
    prioritizedParticipants.push(...arr);
  }

  console.log(
    `   Academias: ${sortedAcademies
      .map(([id, parts]) => `${id}:${parts.length}`)
      .join(", ")}`
  );

  // 2. DETECTAR ACADEMIAS MAYORITARIAS (>50%)
  const majorityAcademies = new Set<number>();
  for (const [academyId, members] of sortedAcademies) {
    if (members.length > numParticipants * 0.5) {
      majorityAcademies.add(academyId);
      console.log(
        `   ⚠️ Academia ${academyId} es mayoritaria (${members.length}/${numParticipants}) - Se permiten choques`
      );
    }
  }

  // 3. BALANCE POR ACADEMIA (upper/lower)
  const academyBalance = new Map<
    number,
    {
      upper: number;
      lower: number;
      expectUpper: number;
      expectLower: number;
    }
  >();

  for (const [academyId, members] of sortedAcademies) {
    const total = members.length;
    academyBalance.set(academyId, {
      upper: 0,
      lower: 0,
      expectUpper: Math.ceil(total / 2),
      expectLower: Math.floor(total / 2),
    });
  }

  function academyHasSpace(academyId: number, isUpper: boolean): boolean {
    const bal = academyBalance.get(academyId)!;
    const members = sortedAcademies.find(([id]) => id === academyId)?.[1] || [];

    // CASO ESPECIAL: Si la academia tiene solo 1 participante, puede ir a cualquier lado
    if (members.length === 1) return true;

    return isUpper ? bal.upper < bal.expectUpper : bal.lower < bal.expectLower;
  }

  // 4. ORDEN DE SIEMBRA (S-CURVE)
  const standardSeedsMap: Record<number, number[]> = {
    4: [0, 3, 1, 2],
    8: [0, 7, 3, 4, 1, 6, 2, 5],
    16: [0, 15, 7, 8, 3, 12, 4, 11, 2, 13, 6, 9, 5, 10, 1, 14],
    32: [
      0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20, 1, 30, 14, 17,
      6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21,
    ],
  };

  const seedingSlots = standardSeedsMap[tournamentSize] || [];
  if (seedingSlots.length === 0) {
    console.warn(
      `⚠️ No hay patrón S-curve para ${tournamentSize}, usando fallback lineal`
    );
    for (let i = 0; i < tournamentSize; i++) seedingSlots.push(i);
  }

  const bracketSlots: (number | null)[] = new Array(tournamentSize).fill(null);
  const assigned = new Set<number>();
  const unassigned: ParticipantWithAcademy[] = [];

  let participantIndex = 0;

  // 5. ASIGNACIÓN PRINCIPAL CON VALIDACIÓN DE CHOQUE DIRECTO
  console.log(
    `\n   🔄 Asignación principal usando S-curve: [${seedingSlots.join(", ")}]`
  );

  for (const slot of seedingSlots) {
    if (participantIndex >= prioritizedParticipants.length) break;

    const p = prioritizedParticipants[participantIndex];
    const academyId = getParticipantAcademyId(p);
    const isUpperHalf = slot < halfSize;
    const opponentSlot = slot % 2 === 0 ? slot + 1 : slot - 1;
    const academyMembers =
      sortedAcademies.find(([id]) => id === academyId)?.[1] || [];

    // Validación 1: Simetría por academia (SOLO si tiene múltiples participantes)
    if (academyMembers.length > 1 && !academyHasSpace(academyId, isUpperHalf)) {
      console.log(
        `      ⏭️ ${p.student?.firstname}: No hay espacio en ${
          isUpperHalf ? "upper" : "lower"
        } (balance), a unassigned`
      );
      unassigned.push(p);
      participantIndex++;
      continue;
    }

    // Validación 2: Evitar choque directo SI NO es academia mayoritaria
    let avoidConflict = true;
    if (!majorityAcademies.has(academyId)) {
      if (bracketSlots[opponentSlot] !== null) {
        const opp = participants.find(
          (x) => x.id === bracketSlots[opponentSlot]
        )!;
        const oppAcad = getParticipantAcademyId(opp);
        if (oppAcad === academyId) {
          console.log(
            `      ⏭️ ${p.student?.firstname}: Choque con ${opp.student?.firstname} (misma academia), a unassigned`
          );
          avoidConflict = false;
        }
      }
    }

    if (!avoidConflict) {
      unassigned.push(p);
      participantIndex++;
      continue;
    }

    // ASIGNACIÓN EXITOSA
    bracketSlots[slot] = p.id;
    assigned.add(p.id);

    const bal = academyBalance.get(academyId)!;
    if (isUpperHalf) bal.upper++;
    else bal.lower++;

    console.log(
      `      ✅ ${p.student?.firstname} → slot ${slot} (${
        isUpperHalf ? "upper" : "lower"
      })`
    );
    participantIndex++;
  }

  // 6. RE-ASIGNACIÓN DE LOS QUE NO ENTRARON
  if (unassigned.length > 0) {
    console.log(
      `\n   🔄 Re-asignando ${unassigned.length} participantes no ubicados...`
    );
  }

  for (const p of unassigned) {
    const academyId = getParticipantAcademyId(p);
    const academyMembers =
      sortedAcademies.find(([id]) => id === academyId)?.[1] || [];
    let placed = false;

    console.log(
      `      🔍 Buscando slot para ${p.student?.firstname} (Academia ${academyId}, tiene ${academyMembers.length} miembros)...`
    );

    for (let slot = 0; slot < tournamentSize && !placed; slot++) {
      if (bracketSlots[slot] !== null) continue;

      const isUpperHalf = slot < halfSize;

      // Validar balance (SOLO si tiene múltiples participantes)
      if (academyMembers.length > 1 && !academyHasSpace(academyId, isUpperHalf))
        continue;

      const opponentSlot = slot % 2 === 0 ? slot + 1 : slot - 1;

      let avoidConflict = true;
      if (
        !majorityAcademies.has(academyId) &&
        bracketSlots[opponentSlot] !== null
      ) {
        const opp = participants.find(
          (x) => x.id === bracketSlots[opponentSlot]
        )!;
        const oppAcad = getParticipantAcademyId(opp);
        if (oppAcad === academyId) {
          avoidConflict = false;
        }
      }

      if (!avoidConflict) continue;

      // Asignar
      bracketSlots[slot] = p.id;
      assigned.add(p.id);

      const bal = academyBalance.get(academyId)!;
      if (isUpperHalf) bal.upper++;
      else bal.lower++;

      console.log(
        `         ✅ Asignado en slot ${slot} (${
          isUpperHalf ? "upper" : "lower"
        })`
      );
      placed = true;
    }

    if (!placed) {
      console.log(
        `         ❌ NO se pudo reubicar ${p.student?.firstname}, pasará a fallback forzado`
      );
    }
  }

  // 7. FALLBACK FORZADO SI AÚN QUEDAN SIN ASIGNAR
  const missing = prioritizedParticipants.filter((x) => !assigned.has(x.id));

  if (missing.length > 0) {
    console.log(
      `   ⚠️ Hay ${missing.length} participantes sin asignar, aplicando fallback forzado...`
    );
    for (const m of missing) {
      console.log(
        `      - ${m.student?.firstname} ${
          m.student?.lastname
        } (Academia ${getParticipantAcademyId(m)})`
      );
    }
  }

  let mi = 0;
  for (let i = 0; i < bracketSlots.length && mi < missing.length; i++) {
    if (bracketSlots[i] === null) {
      const p = missing[mi];
      bracketSlots[i] = p.id;
      assigned.add(p.id);
      console.log(
        `      ✅ Asignado ${p.student?.firstname} en slot ${i} (forzado)`
      );
      mi++;
    }
  }

  // 8. VERIFICACIÓN Y REPORTE FINAL
  const numMatchesR1 = tournamentSize / 2;
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICACIÓN FINAL DE REGLAS DE NEGOCIO");
  console.log("=".repeat(60));

  // REGLA 1: Verificar anti-choque de academias
  console.log("\n🔍 REGLA 1: Anti-Choque de Academias (R1)");
  let choquesDetectados = 0;

  for (let matchIndex = 0; matchIndex < numMatchesR1; matchIndex++) {
    const slotAkka = matchIndex * 2;
    const slotAo = matchIndex * 2 + 1;
    const akkaId = bracketSlots[slotAkka];
    const aoId = bracketSlots[slotAo];

    if (akkaId && aoId) {
      const akkaAcad = getParticipantAcademyIdById(akkaId, participants);
      const aoAcad = getParticipantAcademyIdById(aoId, participants);

      if (akkaAcad === aoAcad && akkaAcad !== 0) {
        choquesDetectados++;
        const esMayoritaria = majorityAcademies.has(akkaAcad);
        const p1 = participants.find((p) => p.id === akkaId);
        const p2 = participants.find((p) => p.id === aoId);
        console.log(
          `   ${esMayoritaria ? "✅" : "❌"} Match ${matchIndex + 1}: ${
            p1?.student?.firstname
          } vs ${p2?.student?.firstname} (Academia ${akkaAcad}) ${
            esMayoritaria ? "- PERMITIDO (mayoritaria)" : "- ¡VIOLACIÓN!"
          }`
        );
      }
    }
  }

  if (choquesDetectados === 0) {
    console.log("   ✅ No hay choques de misma academia en R1");
  }

  // REGLA 2: Verificar distribución simétrica
  console.log("\n🔍 REGLA 2: Distribución Simétrica (Upper/Lower)");
  for (const [academyId, balance] of academyBalance.entries()) {
    const cumpleBalance =
      (balance.upper === balance.expectUpper &&
        balance.lower === balance.expectLower) ||
      Math.abs(balance.upper - balance.expectUpper) <= 1;

    const status = cumpleBalance ? "✅" : "⚠️";
    console.log(
      `   ${status} Academia ${academyId}: ${balance.upper} arriba / ${balance.lower} abajo (esperado: ${balance.expectUpper}/${balance.expectLower})`
    );
  }

  // Asignación completa
  console.log(`\n🔍 ASIGNACIÓN COMPLETA:`);
  console.log(
    `   Participantes: ${numParticipants}, Asignados: ${assigned.size}`
  );

  if (assigned.size !== numParticipants) {
    console.error(
      `   ❌ ERROR: Faltan ${numParticipants - assigned.size} participantes`
    );
  } else {
    console.log(`   ✅ Todos asignados correctamente`);
  }

  // Bracket final
  console.log(`\n📋 BRACKET FINAL (R1):`);
  for (let i = 0; i < bracketSlots.length; i += 2) {
    const p1 = participants.find((p) => p.id === bracketSlots[i]);
    const p2 = participants.find((p) => p.id === bracketSlots[i + 1]);
    const p1Name = p1
      ? `${p1.student?.firstname} ${p1.student?.lastname}`
      : "BYE";
    const p2Name = p2
      ? `${p2.student?.firstname} ${p2.student?.lastname}`
      : "BYE";
    console.log(`   Match ${i / 2 + 1}: ${p1Name} vs ${p2Name}`);
  }
  console.log("=".repeat(60) + "\n");

  return {
    result: bracketSlots,
    assignedCount: assigned.size,
  };
}

export class MatchService {
  /**
   * GENERA BRACKETS: Algoritmo optimizado y adaptado
   */
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
        where: { championshipId },
        include: {
          participants: {
            include: { student: { include: { academy: true } } },
          },
        },
      });

      return prisma.$transaction(
        async (tx) => {
          // Eliminar matches existentes
          console.log(
            `🗑 Eliminando matches existentes del campeonato ${championshipId}...`
          );
          await tx.match.deleteMany({
            where: { championshipCategory: { championshipId } },
          });

          for (const category of categories) {
            const participants =
              category.participants as ParticipantWithAcademy[];
            const numParticipants = participants.length;

            if (numParticipants < 2) {
              console.warn(
                `⚠ Categoría ${category.code}: insuficientes participantes.`
              );
              continue;
            }

            console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(
              `🏆 Categoría ${category.code}: ${numParticipants} participantes`
            );

            const bracketSize = upperPowerOfTwo(numParticipants);
            const totalRounds = Math.log2(bracketSize);

            // SELECCIÓN DE FASES: Ajustar el mapeo para usar solo las fases necesarias.
            const sortedPhases = allPhases.sort((a, b) => a.order - b.order);

            if (sortedPhases.length < totalRounds) {
              throw new Error(
                `Categoría ${category.code} requiere ${totalRounds} fases, solo hay ${sortedPhases.length}.`
              );
            }

            // Seleccionar solo las 'totalRounds' fases necesarias
            const requiredPhases = sortedPhases.slice(
              sortedPhases.length - totalRounds
            );

            // SEEDING INTELIGENTE
            const { result: seededParticipants, assignedCount } =
              seedParticipants(participants, bracketSize);

            // MANEJO DE ERRORES: VALIDACIÓN CRÍTICA DE CONTEO (se usa el conteo real de participantes)
            if (assignedCount !== numParticipants) {
              throw new Error(
                `❌ Error Crítico: La categoría ${category.code} ingresó ${numParticipants} participantes, pero el algoritmo solo logró asignar ${assignedCount} correctamente, lo que puede indicar una falla en la lógica de siembra.`
              );
            }

            let previousRoundMatches: any[] = [];

            // Generar todas las rondas
            for (let r = 0; r < totalRounds; r++) {
              const phase = requiredPhases[r];
              const numMatchesInRound = bracketSize / Math.pow(2, r + 1);
              const currentRoundMatches: any[] = [];

              console.log(
                `   📍 Ronda ${r + 1} (${
                  phase.description
                }): ${numMatchesInRound} matches`
              );

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
                  nextMatchSide: null,
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
                  } else if (!akkaId && aoId) {
                    newMatchData.winnerId = aoId;
                    newMatchData.status = "Completado";
                  }

                  // Logging para verificar choques
                  if (akkaId !== null && aoId !== null) {
                    const p1Acad =
                      participants.find((p) => p.id === akkaId)?.student
                        ?.academy?.id ?? 0;
                    const p2Acad =
                      participants.find((p) => p.id === aoId)?.student?.academy
                        ?.id ?? 0;

                    if (p1Acad === p2Acad && p1Acad !== 0) {
                      console.warn(
                        `      ⚠ Choque Academia: Match ${
                          i + 1
                        } (${p1Acad} vs ${p2Acad})`
                      );
                    }
                  }

                  const p1 = participants.find(
                    (x) => x.id === newMatchData.participantAkkaId
                  );
                  const p2 = participants.find(
                    (x) => x.id === newMatchData.participantAoId
                  );
                  const p1Name = p1
                    ? `${p1.student?.firstname} ${p1.student?.lastname}`
                    : "BYE";
                  const p2Name = p2
                    ? `${p2.student?.firstname} ${p2.student?.lastname}`
                    : "BYE";

                  console.log(
                    `      ⚔ Match ${i + 1}: ${p1Name} vs ${p2Name} (${
                      newMatchData.status
                    })`
                  );
                }

                const createdMatch = await tx.match.create({
                  data: newMatchData,
                });
                currentRoundMatches.push(createdMatch);
              }

              // Conectar rondas
              if (r > 0) {
                for (let i = 0; i < numMatchesInRound; i++) {
                  const currentMatchId = currentRoundMatches[i].id;

                  const prevMatch1 = previousRoundMatches[i * 2];
                  const prevMatch2 = previousRoundMatches[i * 2 + 1];

                  // Establecer punteros nextMatchId
                  if (prevMatch1) {
                    await tx.match.update({
                      where: { id: prevMatch1.id },
                      data: {
                        nextMatchId: currentMatchId,
                        nextMatchSide: "Akka",
                      },
                    });

                    // Promover ganador de BYE automáticamente
                    if (
                      prevMatch1.status === "Completado" &&
                      prevMatch1.winnerId
                    ) {
                      await tx.match.update({
                        where: { id: currentMatchId },
                        data: { participantAkkaId: prevMatch1.winnerId },
                      });
                    }
                  }

                  if (prevMatch2) {
                    await tx.match.update({
                      where: { id: prevMatch2.id },
                      data: {
                        nextMatchId: currentMatchId,
                        nextMatchSide: "Ao",
                      },
                    });

                    // Promover ganador de BYE automáticamente
                    if (
                      prevMatch2.status === "Completado" &&
                      prevMatch2.winnerId
                    ) {
                      await tx.match.update({
                        where: { id: currentMatchId },
                        data: { participantAoId: prevMatch2.winnerId },
                      });
                    }
                  }
                }
              }

              previousRoundMatches = currentRoundMatches;
            }

            // 🔄 PROPAGACIÓN AUTOMÁTICA DE BYES: Avanzar participantes sin oponente
            await this.autoAdvanceByes(tx, category.id);
          }

          return { message: `Brackets generados con sembrado adaptado.` };
        },
        { timeout: 60000 }
      );
    } catch (error) {
      console.error(`❌ ERROR BRACKETS:`, error);
      throw error;
    }
  }

  /**
   * 🔄 AUTO ADVANCE BYES
   * Avanza automáticamente a participantes SOLO cuando NO hay posibilidad de que llegue un contrincante.
   *
   * REGLAS:
   * 1. Si un match tiene 1 participante y el otro slot está esperando un ganador → NO avanzar (quedarse esperando)
   * 2. Si un match tiene 1 participante y el otro slot NO puede recibir a nadie (BYE total) → SÍ avanzar
   *
   * Ejemplos:
   * ❌ Roxana en cuartos esperando ganador de Lucia vs Carol → NO avanza, se queda esperando
   * ✅ Brenda sin nadie antes que pueda llegar → SÍ avanza a semifinal
   * ❌ Any esperando posible contrincante → NO avanza, se queda esperando
   */
  private async autoAdvanceByes(
    tx: Prisma.TransactionClient,
    championshipCategoryId: number
  ): Promise<void> {
    console.log(`   🔄 Verificando avances automáticos por BYE...`);

    // Obtener todos los matches ordenados por fase
    const allMatches = await tx.match.findMany({
      where: { championshipCategoryId },
      include: { phase: true },
      orderBy: [{ phase: { order: "asc" } }, { matchNumber: "asc" }],
    });

    // Crear mapa de matches por ID para búsqueda rápida
    const matchMap = new Map(allMatches.map((m) => [m.id, m]));

    // Función auxiliar: ¿Puede llegar alguien a este slot?
    const canReceiveOpponent = (
      matchId: number,
      side: "Akka" | "Ao"
    ): boolean => {
      // Buscar matches que apunten a este match en este lado
      const feedingMatches = allMatches.filter(
        (m) => m.nextMatchId === matchId && m.nextMatchSide === side
      );

      if (feedingMatches.length === 0) {
        // No hay matches que alimenten este slot → es un BYE total
        return false;
      }

      // Verificar si alguno de los matches alimentadores tiene o puede tener participantes
      for (const feeder of feedingMatches) {
        const hasAnyParticipant =
          feeder.participantAkkaId !== null || feeder.participantAoId !== null;
        if (hasAnyParticipant) {
          // Hay al menos 1 participante en el feeder → puede llegar alguien
          return true;
        }
      }

      // Ningún feeder tiene participantes → BYE total
      return false;
    };

    let hasChanges = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (hasChanges && iterations < MAX_ITERATIONS) {
      hasChanges = false;
      iterations++;

      for (const match of allMatches) {
        const hasAkka = match.participantAkkaId !== null;
        const hasAo = match.participantAoId !== null;

        // Solo procesar matches con exactamente 1 participante
        if ((hasAkka && !hasAo) || (!hasAkka && hasAo)) {
          const soloParticipantId = hasAkka
            ? match.participantAkkaId!
            : match.participantAoId!;
          const emptySlot = hasAkka ? "Ao" : "Akka";

          // REGLA CLAVE: ¿Puede llegar alguien al slot vacío?
          const waitingForOpponent = canReceiveOpponent(match.id, emptySlot);

          if (waitingForOpponent) {
            // Hay posibilidad de contrincante → NO avanzar, quedarse esperando
            console.log(
              `      ⏸️  Participante ${soloParticipantId} en ${match.phase.description} - Esperando posible contrincante`
            );
            continue;
          }

          // No hay posibilidad de contrincante → avanzar a siguiente ronda
          if (match.nextMatchId && match.nextMatchSide) {
            const nextMatch = matchMap.get(match.nextMatchId);

            if (nextMatch) {
              const targetField =
                match.nextMatchSide === "Akka"
                  ? "participantAkkaId"
                  : "participantAoId";

              // Solo avanzar si el slot destino está vacío
              if (nextMatch[targetField] === null) {
                await tx.match.update({
                  where: { id: match.nextMatchId },
                  data: { [targetField]: soloParticipantId },
                });

                nextMatch[targetField] = soloParticipantId;
                hasChanges = true;

                console.log(
                  `      ✅ Participante ${soloParticipantId}: ${match.phase.description} → ${nextMatch.phase.description} (BYE confirmado)`
                );
              }
            }
          }

          // Marcar match como completado
          if (match.status !== "Completado") {
            await tx.match.update({
              where: { id: match.id },
              data: {
                status: "Completado",
                winnerId: soloParticipantId,
              },
            });
            match.status = "Completado";
            match.winnerId = soloParticipantId;
            hasChanges = true;
          }
        }
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(
        `   ⚠️  Límite de iteraciones alcanzado (${MAX_ITERATIONS})`
      );
    } else {
      console.log(
        `   ✅ Verificación completada en ${iterations} iteración(es)`
      );
    }
  }

  /**
   * Obtiene los brackets (lista de combates) de una categoría
   */
  async getBracketsByCategory(
    championshipCategoryId: number
  ): Promise<MatchDetails[]> {
    const bracketInclude = {
      championshipCategory: {
        select: {
          id: true,
          code: true,
          modality: true,
          gender: true,
          weight: true,
          beltMin: { select: { id: true, name: true, kyuLevel: true } },
          beltMax: { select: { id: true, name: true, kyuLevel: true } },
          ageRange: {
            select: { id: true, label: true, minAge: true, maxAge: true },
          },
        },
      },
      phase: { select: { description: true, order: true } },
      participantAkka: {
        include: {
          student: {
            select: {
              firstname: true,
              lastname: true,
              academy: { select: { name: true } },
            },
          },
        },
      },
      participantAo: {
        include: {
          student: {
            select: {
              firstname: true,
              lastname: true,
              academy: { select: { name: true } },
            },
          },
        },
      },
      winner: {
        include: {
          student: { select: { firstname: true, lastname: true } },
        },
      },
    };

    return prisma.match.findMany({
      where: { championshipCategoryId },
      include: bracketInclude,
      orderBy: [{ phase: { order: "asc" } }, { matchNumber: "asc" }],
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
      orderBy: [{ phase: { order: "desc" } }, { matchNumber: "desc" }],
    });

    if (!finalMatch) {
      return { gold: null, silver: null, bronze: [] };
    }

    // Helper para obtener datos del participante
    const getStudentInfo = async (participantId: number | null) => {
      if (!participantId) return null;
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { student: { include: { academy: true } } },
      });
      if (!participant || !participant.student) return null;
      return {
        participantId: participant.id,
        studentId: participant.student.id,
        firstname: participant.student.firstname,
        lastname: participant.student.lastname,
        academy: participant.student.academy
          ? {
              id: participant.student.academy.id,
              name: participant.student.academy.name,
            }
          : null,
      };
    };

    // 🥇 ORO
    const gold = await getStudentInfo(finalMatch.winnerId as number);

    // 🥈 PLATA
    let silver = null;
    const akka = finalMatch.participantAkkaId;
    const ao = finalMatch.participantAoId;
    if (akka && ao) {
      const loserId = finalMatch.winnerId === akka ? ao : akka;
      silver = await getStudentInfo(loserId as number);
    }

    // 🥉🥉 DOBLE BRONCE
    let bronze: Array<any> = [];
    const bronzeMatches = await prisma.match.findMany({
      where: {
        championshipCategoryId,
        winnerId: { not: null },
        phase: { description: { contains: "Bronce", mode: "insensitive" } },
      },
      include: { phase: true },
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
          where: {
            championshipCategoryId,
            phase: { order: semiOrder },
            winnerId: { not: null },
          },
          include: { phase: true },
        });

        for (const sm of semis) {
          const loserId =
            sm.participantAkkaId === sm.winnerId
              ? sm.participantAoId
              : sm.participantAkkaId;
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
        scoreAo: scoreAo,
      },
    });

    if (updatedMatch.nextMatchId) {
      const updateData: Prisma.MatchUpdateInput = {};

      if (updatedMatch.nextMatchSide === "Akka") {
        updateData.participantAkka = { connect: { id: winnerId } };
      } else if (updatedMatch.nextMatchSide === "Ao") {
        updateData.participantAo = { connect: { id: winnerId } };
      }

      await prisma.match.update({
        where: { id: updatedMatch.nextMatchId },
        data: updateData,
      });
    }

    return updatedMatch;
  }
  /**
   * Avanza automáticamente participantes cuando un match tiene solo 1 competidor
   * (o sea, BYE) para que suba a cuartos, semis o final según corresponda.
   */
  private async autoAdvanceIncompleteRounds(
    tx: Prisma.TransactionClient,
    championshipCategoryId: number
  ): Promise<void> {
    // Obtener todos los matches de la categoría ordenados por fase y número
    const matches = await tx.match.findMany({
      where: { championshipCategoryId },
      include: { phase: true },
      orderBy: [{ phase: { order: "asc" } }, { matchNumber: "asc" }],
    });

    // Agrupar por orden de fase
    const phasesMap = new Map<number, any[]>();
    for (const m of matches) {
      const order = m.phase.order;
      if (!phasesMap.has(order)) {
        phasesMap.set(order, []);
      }
      phasesMap.get(order)!.push(m);
    }

    const orderedPhaseOrders = [...phasesMap.keys()].sort((a, b) => a - b);

    // Recorremos fase por fase (octavos → cuartos → semis → final)
    for (const phaseOrder of orderedPhaseOrders) {
      const roundMatches = phasesMap.get(phaseOrder)!;

      for (const match of roundMatches) {
        const hasAkka = !!match.participantAkkaId;
        const hasAo = !!match.participantAoId;

        // Caso 1: 0 participantes → match “muerto”, no hacemos nada
        if (!hasAkka && !hasAo) {
          continue;
        }

        // Caso 2: solo 1 participante → debe avanzar automáticamente
        if (hasAkka && !hasAo) {
          await this.promoteWinner(tx, match, match.participantAkkaId);
        } else if (!hasAkka && hasAo) {
          await this.promoteWinner(tx, match, match.participantAoId);
        }
        // Caso 3: hay 2 participantes → pelea normal, se resuelve por updateMatchScore/updateMatchWinner
      }
    }
  }

  /**
   * Marca un match como completado con un ganador y lo promociona al siguiente match
   * (nextMatchId, nextMatchSide).
   */
  private async promoteWinner(
    tx: Prisma.TransactionClient,
    match: any,
    winnerId: number
  ): Promise<void> {
    // Marcar este match como completado con el ganador correspondiente
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "Completado",
        winnerId: winnerId,
      },
    });

    // Si no tiene siguiente combate, no hay nada más que hacer
    if (!match.nextMatchId || !match.nextMatchSide) {
      return;
    }

    // Actualizar el siguiente match con el ganador en el lado correcto
    const nextUpdateData: any = {};

    if (match.nextMatchSide === "Akka") {
      nextUpdateData.participantAkkaId = winnerId;
    } else if (match.nextMatchSide === "Ao") {
      nextUpdateData.participantAoId = winnerId;
    }

    await tx.match.update({
      where: { id: match.nextMatchId },
      data: nextUpdateData,
    });
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
        nextMatchSide: true,
      },
    });

    if (!match) {
      throw new Error(`Match con ID ${matchId} no encontrado`);
    }

    if (!match.participantAkkaId || !match.participantAoId) {
      throw new Error(
        "No se puede determinar ganador: falta uno o ambos participantes"
      );
    }

    let winnerId: number;
    if (scoreAkka > scoreAo) {
      winnerId = match.participantAkkaId;
    } else if (scoreAo > scoreAkka) {
      winnerId = match.participantAoId;
    } else {
      throw new Error(
        "No puede haber empate. Los scores deben ser diferentes."
      );
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        scoreAkka: scoreAkka,
        scoreAo: scoreAo,
        winnerId: winnerId,
        status: "Completado",
      },
    });

    if (match.nextMatchId) {
      const updateData: Prisma.MatchUpdateInput = {};

      if (match.nextMatchSide === "Akka") {
        updateData.participantAkka = { connect: { id: winnerId } };
      } else if (match.nextMatchSide === "Ao") {
        updateData.participantAo = { connect: { id: winnerId } };
      }

      await prisma.match.update({
        where: { id: match.nextMatchId },
        data: updateData,
      });
    }

    return updatedMatch;
  }
}
