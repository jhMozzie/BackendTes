// test-seeding.ts
// Script para probar el algoritmo de seeding sin modificar la base de datos

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function testSeeding() {
  console.log("\n🧪 PROBANDO ALGORITMO DE SEEDING\n");
  
  // Obtener participantes de Kata (8 participantes)
  const kataParticipants = await prisma.participant.findMany({
    where: { championshipCategoryId: 26 }, // A48 - Kata
    include: {
      student: {
        include: {
          academy: { select: { id: true, name: true } }
        }
      }
    }
  });
  
  console.log("═══════════════════════════════════════════════════════");
  console.log(`📋 KATA (8 participantes):`);
  console.log("═══════════════════════════════════════════════════════");
  
  const kataByAcademy = new Map<string, any[]>();
  for (const p of kataParticipants) {
    const academyName = p.student?.academy?.name || 'Sin Academia';
    if (!kataByAcademy.has(academyName)) {
      kataByAcademy.set(academyName, []);
    }
    kataByAcademy.get(academyName)!.push(p);
  }
  
  console.log("\n📊 Distribución actual:");
  for (const [academy, participants] of kataByAcademy.entries()) {
    console.log(`   ${academy}: ${participants.length} participantes`);
    participants.forEach(p => {
      console.log(`      - ID ${p.id}: ${p.student?.firstname} ${p.student?.lastname}`);
    });
  }
  
  // Obtener participantes de Kumite (12 participantes)
  const kumiteParticipants = await prisma.participant.findMany({
    where: { championshipCategoryId: 27 }, // A49 - Kumite
    include: {
      student: {
        include: {
          academy: { select: { id: true, name: true } }
        }
      }
    }
  });
  
  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`🥊 KUMITE (12 participantes):`);
  console.log("═══════════════════════════════════════════════════════");
  
  const kumiteByAcademy = new Map<string, any[]>();
  for (const p of kumiteParticipants) {
    const academyName = p.student?.academy?.name || 'Sin Academia';
    if (!kumiteByAcademy.has(academyName)) {
      kumiteByAcademy.set(academyName, []);
    }
    kumiteByAcademy.get(academyName)!.push(p);
  }
  
  console.log("\n📊 Distribución actual:");
  for (const [academy, participants] of kumiteByAcademy.entries()) {
    console.log(`   ${academy}: ${participants.length} participantes`);
    participants.forEach(p => {
      console.log(`      - ID ${p.id}: ${p.student?.firstname} ${p.student?.lastname}`);
    });
  }
  
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("✅ Datos listos para generar brackets");
  console.log("═══════════════════════════════════════════════════════\n");
}

testSeeding()
  .catch(e => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
