import { PrismaClient, Student, Academy, Championship, Prisma } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed (Versión simplificada para Brackets Kata)...");

  // =====================================================
  // 1️⃣ Crear roles base
  // =====================================================
  console.log("🔑 Creando roles base...");
  const roles = ["Administrador", "Entrenador", "Estudiante"];
  for (const role of roles) {
    await prisma.role.upsert({
      where: { description: role },
      update: {},
      create: { description: role },
    });
  }
  const adminRole = await prisma.role.findFirstOrThrow({ where: { description: "Administrador" } });
  const coachRole = await prisma.role.findFirstOrThrow({ where: { description: "Entrenador" } });
  const studentRole = await prisma.role.findFirstOrThrow({ where: { description: "Estudiante" } });
  console.log("✅ Roles base asegurados.");

  // =====================================================
  // 2️⃣ Crear Cinturones (Belts)
  // =====================================================
  console.log("🥋 Creando cinturones...");
  const beltsData = [
    { name: "Blanco", kyuLevel: 11 }, { name: "Celeste", kyuLevel: 10 }, { name: "Amarillo", kyuLevel: 9 },
    { name: "Naranja", kyuLevel: 8 }, { name: "Naranja punta verde", kyuLevel: 7 }, { name: "Verde", kyuLevel: 6 },
    { name: "Verde punta azul", kyuLevel: 5 }, { name: "Azul", kyuLevel: 4 }, { name: "Marrón", kyuLevel: 3 },
    { name: "Marrón", kyuLevel: 2 }, { name: "Marrón", kyuLevel: 1 }, { name: "Negro", kyuLevel: 0 },
  ];
  for (const belt of beltsData) {
    await prisma.belt.upsert({
      where: { kyuLevel: belt.kyuLevel },
      update: { name: belt.name },
      create: belt,
    });
  }
  const allBelts = await prisma.belt.findMany();
  const blackBelt = allBelts.find(b => b.kyuLevel === 0);
  const brownBelt3Kyu = allBelts.find(b => b.kyuLevel === 3);
  if (!blackBelt || !brownBelt3Kyu) throw new Error("❌ No se encontraron cinturones base.");
  console.log("✅ Cinturones asegurados.");

  // =====================================================
  // 3️⃣ Usuario Administrador principal
  // =====================================================
  await prisma.user.upsert({
    where: { email: "admin@academy.com" }, update: {},
    create: {
      email: "admin@academy.com", username: "adminPrincipal", password: await bcrypt.hash("123456", 10),
      phone: "+51 900 111 222", birthdate: new Date("1990-01-01"), status: "Activo", roleId: adminRole.id,
    },
  });

  // =====================================================
  // 4️⃣ Crear 3 Coaches y Academias
  // =====================================================
  console.log("🏋️ Creando 3 coaches y academias...");
  const academies: Academy[] = [];
  for (let i = 1; i <= 3; i++) {
    const email = `dojo${i}@academy.com`;
    const coachUser = await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, username: `dojo${i}`, password: await bcrypt.hash("123456", 10), status: "Activo", roleId: coachRole.id },
    });
    const academy = await prisma.academy.upsert({
      where: { userId: coachUser.id }, update: {},
      create: { name: `Academia Dojo ${i}`, userId: coachUser.id },
    });
    academies.push(academy);
  }
  console.log("✅ 3 Coaches y Academias asegurados.");

  // =====================================================
  // 5️⃣ Crear Estudiantes (6 por academia)
  // =====================================================
  console.log("🎓 Creando estudiantes (18 en total)...");
  const allStudents: Student[] = [];
  const baseNames = [
    ["Juan", "Pérez"], ["Carlos", "Ruiz"], ["Miguel", "Sanz"],
    ["Ana", "Sánchez"], ["María", "González"], ["Luis", "García"],
  ];
  
  for (let a = 0; a < academies.length; a++) {
    const academy = academies[a];
    for (let i = 0; i < baseNames.length; i++) {
      const [firstname, lastname] = baseNames[i];
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}${a}@academy.com`;
      const birthdate = new Date("1998-05-10"); // Todos Senior
      const beltToUse = (i % 2 === 0) ? blackBelt.id : brownBelt3Kyu.id; // Alternar cinturones

      const studentUser = await prisma.user.upsert({
        where: { email }, update: {},
        create: {
          email, username: `${firstname}${lastname}${a}`, password: await bcrypt.hash("123456", 10),
          birthdate, status: "Activo", roleId: studentRole.id,
        },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: { beltId: beltToUse, academyId: academy.id },
        create: {
          firstname, lastname, birthdate, beltId: beltToUse, 
          userId: studentUser.id, academyId: academy.id,
        },
      });
      allStudents.push(student);
    }
  }
  console.log(`✅ ${allStudents.length} Estudiantes Senior asegurados.`);

  // =====================================================
  // 6️⃣ Crear Campeonatos
  // =====================================================
  const championshipData: Prisma.ChampionshipUncheckedCreateInput = { 
    name: "Campeonato Nacional Kata WKF", 
    startDate: new Date("2025-03-15"), location: "Estadio Nacional", district: "Jesús María", province: "Lima", country: "Perú", 
    description: "El evento cumbre de Kata...", status: "Activo", academyId: academies[0].id 
  };
  const championship = await prisma.championship.upsert({
    where: { name: championshipData.name },
    update: { startDate: championshipData.startDate, status: championshipData.status },
    create: championshipData,
  });
  console.log(`✅ Campeonato asegurado: ${championship.name}`);

  // =====================================================
  // 7️⃣ Crear Rangos de Edad (AgeRange)
  // =====================================================
  const ageRangesData = [
    { label: "U14 (12-13 años)", minAge: 12, maxAge: 13 }, { label: "Cadete (14-15 años)", minAge: 14, maxAge: 15 },
    { label: "Junior (16-17 años)", minAge: 16, maxAge: 17 }, { label: "Sub-21 (18-20 años)", minAge: 18, maxAge: 20 },
    { label: "Senior (18+ años)", minAge: 18, maxAge: 99 },
  ];
  const ageRangesMap = new Map<string, number>();
  for (const range of ageRangesData) {
    const dbRange = await prisma.ageRange.upsert({
      where: { label: range.label },
      update: range,
      create: range,
    });
    ageRangesMap.set(range.label, dbRange.id);
  }
  const ageRangeSeniorId = ageRangesMap.get("Senior (18+ años)");
  if (!ageRangeSeniorId) throw new Error("❌ No se encontró el AgeRange Senior.");
  console.log("✅ Rangos de edad asegurados.");
  
  // =====================================================
  // 8️⃣ NUEVO: Crear Fases del Torneo
  // =====================================================
  console.log("🏅 Creando fases del torneo...");
  const phasesData = [
    { description: "Octavos de Final", order: 1 },
    { description: "Cuartos de Final", order: 2 },
    { description: "Semifinal", order: 3 },
    { description: "Final (Oro)", order: 4 },
    { description: "Combate por el Bronce", order: 5 },
  ];
  for (const phase of phasesData) {
     await prisma.phase.upsert({
      where: { order: phase.order },
      update: { description: phase.description },
      create: phase,
    });
  }
  console.log("✅ Fases del torneo aseguradas.");

  // =====================================================
  // 9️⃣ Crear Categorías de KATA (WKF)
  // =====================================================
  console.log("📝 Creando categorías KATA WKF...");
  const kataCategories = [
    { code: "KMS", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kata" },
    { code: "KFS", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kata" },
    // Añade el resto de categorías KATA WKF si las necesitas
  ];
  
  let targetCategoryId: number | undefined;

  for (const catDef of kataCategories) {
    const ageRangeId = ageRangesMap.get(catDef.ageLabel);
    if (!ageRangeId) continue;

    const categoryUniqueData = {
      championshipId: championship.id, modality: catDef.modality, gender: catDef.gender,
      ageRangeId: ageRangeId, beltMinId: brownBelt3Kyu.id, beltMaxId: blackBelt.id, weight: null,
    };
    
    const category = await prisma.championshipCategory.upsert({
      where: { championshipId_modality_gender_ageRangeId_beltMinId_beltMaxId_weight: categoryUniqueData },
      update: { code: catDef.code },
      create: { ...categoryUniqueData, code: catDef.code },
    });
    if (catDef.code === "KMS") {
      targetCategoryId = category.id;
    }
  }
  if (!targetCategoryId) throw new Error("❌ Categoría Kata Masculino Senior (KMS) no creada.");
  console.log("✅ Categorías KATA WKF aseguradas.");

  // =====================================================
  // 🔟 Inscribir a TODOS en KATA MASCULINO SENIOR (KMS)
  // =====================================================
  console.log("🏃‍♂️ Inscribiendo a TODOS los estudiantes en KATA MASCULINO SENIOR...");
  const participantsToEnroll = allStudents.map(student => ({
    studentId: student.id,
    championshipCategoryId: targetCategoryId!,
  }));

  for (const participantData of participantsToEnroll) {
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: participantData },
      update: {},
      create: participantData,
    });
  }
  console.log(`✅ ${allStudents.length} inscripciones (Participantes) creadas/aseguradas en la categoría KMS.`);


  // =====================================================
  // FIN
  // =====================================================
  console.log("🎉 Seed completado con éxito!");

} // Fin de la función main

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });