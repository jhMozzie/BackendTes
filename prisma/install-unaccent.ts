import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔧 Instalando (o verificando) la extensión 'unaccent'...");
    // Ejecuta la creación de la extensión si no existe. Requiere permisos suficientes en la BD.
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
    console.log("✅ Extensión 'unaccent' instalada o ya existente.");
  } catch (e) {
    console.error("❌ Error instalando la extensión 'unaccent':", String(e));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
