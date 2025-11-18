import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function check() {
  console.log('📊 Verificando participantes en KATA (categoría 26):\n');
  
  const participants = await prisma.participant.findMany({
    where: { championshipCategoryId: 26 },
    include: {
      student: {
        include: { academy: true }
      }
    }
  });
  
  console.log(`Total: ${participants.length} participantes\n`);
  
  const byAcademy = new Map<string, string[]>();
  
  for (const p of participants) {
    const academyName = p.student?.academy?.name ?? 'Sin Academia';
    const studentName = `${p.student?.firstname ?? 'Unknown'} ${p.student?.lastname ?? ''}`;
    
    if (!byAcademy.has(academyName)) {
      byAcademy.set(academyName, []);
    }
    byAcademy.get(academyName)!.push(`ID: ${p.id} - ${studentName}`);
  }
  
  for (const [academy, students] of byAcademy) {
    console.log(`${academy}: ${students.length} participantes`);
    students.forEach(s => console.log(`   ${s}`));
    console.log('');
  }
  
  console.log('\n📋 Esperado:');
  console.log('   Club Regatas Lima: 2');
  console.log('   Noikon: 3');
  console.log('   AKD: 1');
  console.log('   Kuba Peru: 2');
  console.log('   TOTAL: 8');
  
  await prisma.$disconnect();
}

check().catch(console.error);
