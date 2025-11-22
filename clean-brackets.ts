import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function clean() {
  const result = await prisma.match.deleteMany({
    where: {
      championshipCategory: {
        championshipId: 1
      }
    }
  });
  
  console.log(`✅ ${result.count} brackets eliminados`);
  await prisma.$disconnect();
}

clean().catch(console.error);
