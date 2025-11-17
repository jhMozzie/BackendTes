import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function checkAgeRanges() {
  console.log('\n📋 Rangos de edad disponibles en la base de datos:\n');
  
  const ranges = await prisma.ageRange.findMany({
    orderBy: { id: 'asc' }
  });
  
  if (ranges.length === 0) {
    console.log('⚠️  No hay rangos de edad en la base de datos.');
    console.log('💡 Ejecuta: pnpm seed');
  } else {
    ranges.forEach(r => {
      console.log(`  ✓ ID: ${r.id} - "${r.label}" (Min: ${r.minAge}, Max: ${r.maxAge})`);
    });
  }
  
  console.log('\n📋 Cinturones disponibles:\n');
  const belts = await prisma.belt.findMany({
    orderBy: { kyuLevel: 'desc' }
  });
  
  belts.forEach(b => {
    console.log(`  ✓ ID: ${b.id} - "${b.name}" (Kyu Level: ${b.kyuLevel})`);
  });
  
  await prisma.$disconnect();
}

checkAgeRanges().catch(console.error);
