import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function check() {
  console.log('📋 Verificando categorías del Campeonato Prueba Nilton:\n');
  
  const categories = await prisma.championshipCategory.findMany({
    where: { 
      championship: { name: 'Campeonato Prueba Nilton' }
    },
    include: {
      participants: {
        include: {
          student: {
            include: { academy: true }
          }
        }
      }
    }
  });
  
  for (const cat of categories) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`ID: ${cat.id}`);
    console.log(`Código: ${cat.code}`);
    console.log(`Modalidad: ${cat.modality}`);
    console.log(`Género: ${cat.gender}`);
    console.log(`Total Participantes: ${cat.participants.length}`);
    
    if (cat.participants.length > 0) {
      console.log(`\nParticipantes:`);
      const byAcademy = new Map<string, string[]>();
      
      for (const p of cat.participants) {
        const academyName = p.student?.academy?.name ?? 'Sin Academia';
        const studentName = `${p.student?.firstname ?? 'Unknown'} ${p.student?.lastname ?? ''}`;
        
        if (!byAcademy.has(academyName)) {
          byAcademy.set(academyName, []);
        }
        byAcademy.get(academyName)!.push(studentName);
      }
      
      for (const [academy, students] of byAcademy) {
        console.log(`   ${academy}: ${students.length}`);
        students.forEach(s => console.log(`      - ${s}`));
      }
    }
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
