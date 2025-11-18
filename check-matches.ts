import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function check() {
  console.log('🔍 Verificando matches generados:\n');
  
  const kata27 = await prisma.match.count({
    where: { championshipCategoryId: 27 }
  });
  
  const kumite28 = await prisma.match.count({
    where: { championshipCategoryId: 28 }
  });
  
  console.log(`Kata (ID 27): ${kata27} matches`);
  console.log(`Kumite (ID 28): ${kumite28} matches\n`);
  
  if (kata27 > 0) {
    console.log('📊 Matches de KATA (8 participantes = 7 matches esperados):');
    const kataMatches = await prisma.match.findMany({
      where: { championshipCategoryId: 27 },
      include: {
        phase: true,
        participantAkka: {
          include: {
            student: {
              include: { academy: true }
            }
          }
        },
        participantAo: {
          include: {
            student: {
              include: { academy: true }
            }
          }
        }
      },
      orderBy: [
        { phase: { order: 'asc' } },
        { matchNumber: 'asc' }
      ]
    });
    
    for (const match of kataMatches) {
      const akkaName = match.participantAkka?.student?.firstname ?? 'TBD';
      const akkaAcademy = match.participantAkka?.student?.academy?.name ?? 'N/A';
      const aoName = match.participantAo?.student?.firstname ?? 'TBD';
      const aoAcademy = match.participantAo?.student?.academy?.name ?? 'N/A';
      
      console.log(`   ${match.phase?.description} ${match.matchNumber}: ${akkaName} (${akkaAcademy}) vs ${aoName} (${aoAcademy})`);
    }
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
