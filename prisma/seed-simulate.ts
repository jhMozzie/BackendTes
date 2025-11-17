import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

/**
 * Seeder de simulación de brackets.
 * - Por defecto procesa todos los campeonatos con status = 'Finalizado'.
 * - Opcionalmente pasa el nombre del campeonato como primer argumento o con la env CHAMPIONSHIP_NAME.
 *
 * Comportamiento:
 * 1) Para cada categoría dentro del campeonato, obtiene los matches ya generados (brackets).
 * 2) Recorre las fases en orden ascendente y para cada combate que no esté completado asigna
 *    scores aleatorios (no empatados) y promueve al ganador al siguiente match (si aplica).
 *
 * Nota: Este seeder asume que los brackets ya han sido generados (matches y conexiones nextMatchId/nextMatchSide).
 */

function getRandomScorePair(): { a: number; b: number } {
  // Generar scores en rango razonable y asegurar que no haya empate
  const a = Math.floor(Math.random() * 10) + 1; // 1..10
  let b = Math.floor(Math.random() * 10) + 1;
  while (b === a) {
    b = Math.floor(Math.random() * 10) + 1;
  }
  return { a, b };
}

/**
 * Valida que el género del estudiante coincida con el género de la categoría
 */
function validateGender(studentGender: string, categoryGender: string, matchId: number, side: string): boolean {
  // Mapear género del estudiante (M/F) a género de categoría (Masculino/Femenino)
  const expectedGender = categoryGender === 'Masculino' ? 'M' : categoryGender === 'Femenino' ? 'F' : null;
  
  if (!expectedGender) {
    console.warn(`     ⚠️  Match ${matchId}: Categoría con género no reconocido "${categoryGender}"`);
    return true; // Permitir por defecto si no reconocemos el género de la categoría
  }
  
  if (studentGender !== expectedGender) {
    console.error(`     ❌ Match ${matchId} (${side}): GÉNERO INCORRECTO! Estudiante tiene género "${studentGender}" pero la categoría requiere "${expectedGender}" (${categoryGender})`);
    return false;
  }
  
  return true;
}

async function simulateChampionship(championshipId: number) {
  console.log(`\n🔁 Simulando campeonato id=${championshipId} ...`);

  // Obtener todas las categorías del campeonato
  const categories = await prisma.championshipCategory.findMany({
    where: { championshipId },
  });

  for (const category of categories) {
    console.log(`\n--- Categoría: ${category.code} (id=${category.id}) - Género: ${category.gender}`);

    // Obtener matches ordenados por fase.order asc, matchNumber asc
    const matches = await prisma.match.findMany({
      where: { championshipCategoryId: category.id },
      include: { 
        participantAkka: { include: { student: true } }, 
        participantAo: { include: { student: true } }, 
        phase: true 
      },
      orderBy: [
        { phase: { order: 'asc' } },
        { matchNumber: 'asc' }
      ]
    });

    if (matches.length === 0) {
      console.log("   ⚠️  No hay matches (brackets) generados para esta categoría. Skipping...");
      continue;
    }

    // Agrupar matches por fase order para procesar en orden
    const matchesByPhase = new Map<number, any[]>();
    for (const m of matches) {
      const order = m.phase?.order ?? 0;
      if (!matchesByPhase.has(order)) matchesByPhase.set(order, []);
      matchesByPhase.get(order)!.push(m);
    }

    const sortedPhaseOrders = Array.from(matchesByPhase.keys()).sort((a, b) => a - b);

    // Procesar fases en orden (de Play-In a Final)
    for (const phaseOrder of sortedPhaseOrders) {
      const roundMatches = matchesByPhase.get(phaseOrder) || [];
      console.log(`   ▶ Procesando fase(order=${phaseOrder}) con ${roundMatches.length} matches`);

      for (const m of roundMatches) {
        // Refrescar match state por si fue modificado en esta sesión
        const match = await prisma.match.findUnique({ where: { id: m.id } });
        if (!match) continue;

        if (match.status === 'Completado') {
          // Ya completado
          continue;
        }

        const akka = match.participantAkkaId;
        const ao = match.participantAoId;

        // If only one side present -> auto-win
        if (akka && !ao) {
          // Validar género del participante Akka
          const akkaParticipant = await prisma.participant.findUnique({
            where: { id: akka },
            include: { student: true }
          });
          
          if (akkaParticipant?.student) {
            validateGender(akkaParticipant.student.gender, category.gender, match.id, 'Akka');
          }
          
          await prisma.match.update({
            where: { id: match.id },
            data: {
              winnerId: akka,
              scoreAkka: 1,
              scoreAo: 0,
              status: 'Completado'
            }
          });

          // Promote to next
          if (match.nextMatchId) {
            const update: any = {};
            if (match.nextMatchSide === 'Akka') update.participantAkka = { connect: { id: akka } };
            else if (match.nextMatchSide === 'Ao') update.participantAo = { connect: { id: akka } };
            if (Object.keys(update).length > 0) {
              await prisma.match.update({ where: { id: match.nextMatchId }, data: update });
            }
          }

          console.log(`     ✓ Match ${match.id}: Auto-win participante ${akka}`);
          continue;
        }

        if (ao && !akka) {
          // Validar género del participante Ao
          const aoParticipant = await prisma.participant.findUnique({
            where: { id: ao },
            include: { student: true }
          });
          
          if (aoParticipant?.student) {
            validateGender(aoParticipant.student.gender, category.gender, match.id, 'Ao');
          }
          
          await prisma.match.update({
            where: { id: match.id },
            data: {
              winnerId: ao,
              scoreAkka: 0,
              scoreAo: 1,
              status: 'Completado'
            }
          });

          if (match.nextMatchId) {
            const update: any = {};
            if (match.nextMatchSide === 'Akka') update.participantAkka = { connect: { id: ao } };
            else if (match.nextMatchSide === 'Ao') update.participantAo = { connect: { id: ao } };
            if (Object.keys(update).length > 0) {
              await prisma.match.update({ where: { id: match.nextMatchId }, data: update });
            }
          }

          console.log(`     ✓ Match ${match.id}: Auto-win participante ${ao}`);
          continue;
        }

        // If both sides present -> simulate random scores
        if (akka && ao) {
          // Validar género de ambos participantes
          const akkaParticipant = await prisma.participant.findUnique({
            where: { id: akka },
            include: { student: true }
          });
          const aoParticipant = await prisma.participant.findUnique({
            where: { id: ao },
            include: { student: true }
          });
          
          let hasGenderError = false;
          if (akkaParticipant?.student) {
            const isValid = validateGender(akkaParticipant.student.gender, category.gender, match.id, 'Akka');
            if (!isValid) hasGenderError = true;
          }
          if (aoParticipant?.student) {
            const isValid = validateGender(aoParticipant.student.gender, category.gender, match.id, 'Ao');
            if (!isValid) hasGenderError = true;
          }
          
          if (hasGenderError) {
            console.error(`     ❌ Match ${match.id}: Se detectaron errores de género. Saltando simulación.`);
            continue;
          }
          
          const { a, b } = getRandomScorePair();
          const winnerId = a > b ? akka : ao;

          await prisma.match.update({
            where: { id: match.id },
            data: {
              winnerId,
              scoreAkka: a,
              scoreAo: b,
              status: 'Completado'
            }
          });

          // Promote to next match
          if (match.nextMatchId) {
            const update: any = {};
            if (match.nextMatchSide === 'Akka') update.participantAkka = { connect: { id: winnerId } };
            else if (match.nextMatchSide === 'Ao') update.participantAo = { connect: { id: winnerId } };
            if (Object.keys(update).length > 0) {
              await prisma.match.update({ where: { id: match.nextMatchId }, data: update });
            }
          }

          console.log(`     ✓ Match ${match.id}: ${akka} (${a}) vs ${ao} (${b}) -> winner ${winnerId}`);
          continue;
        }

        // If neither participant assigned, skip (could be a placeholder)
        console.log(`     - Match ${match.id}: sin participantes asignados, se omite.`);
      }
    }

    // Mostrar ganador final (buscar match en fase con mayor order y matchNumber 1 o el que tenga status Completado y sin nextMatch)
    const finalMatch = await prisma.match.findFirst({
      where: { championshipCategoryId: category.id, status: 'Completado' },
      orderBy: [{ phase: { order: 'desc' } }, { matchNumber: 'desc' }],
      include: { winner: { include: { student: true } }, phase: true }
    });

    if (finalMatch) {
      console.log(`\n   🏅 Ganador final categoría ${category.code}: participantId=${finalMatch.winnerId} (fase: ${finalMatch.phase?.description})`);
    } else {
      console.log(`\n   ⚠️  No se encontró match final completado para ${category.code}`);
    }
  }
}

async function main() {
  const argName = process.env.CHAMPIONSHIP_NAME || process.argv[2];

  const championships = argName
    ? [await prisma.championship.findFirst({ where: { name: argName } })]
    : await prisma.championship.findMany({ where: { status: 'Finalizado' } });

  for (const ch of championships) {
    if (!ch) {
      console.warn(`Campeonato no encontrado: ${argName}`);
      continue;
    }
    await simulateChampionship(ch.id);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed-simulate:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
