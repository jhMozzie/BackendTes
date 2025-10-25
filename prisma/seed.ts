import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // =====================================================
  // 1️⃣ Crear roles base
  // =====================================================
  console.log("🔑 Creando roles base...");
  const roles = [
    { description: "Administrador" },
    { description: "Entrenador" },
    { description: "Estudiante" },
  ];
  for (const role of roles) {
    const existing = await prisma.role.findFirst({ where: { description: role.description } });
    if (!existing) {
      await prisma.role.create({ data: role });
    }
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
    const existingBelt = await prisma.belt.findFirst({ where: { kyuLevel: belt.kyuLevel } });
    if (existingBelt) {
      await prisma.belt.update({ where: { id: existingBelt.id }, data: { name: belt.name } });
    } else {
      await prisma.belt.create({ data: belt });
    }
  }
  const allBelts = await prisma.belt.findMany();
  console.log("✅ Cinturones asegurados.");

  // =====================================================
  // 3️⃣ Usuario Administrador principal
  // =====================================================
  console.log("👑 Creando usuario administrador...");
  const adminEmail = "admin@academy.com";
  const adminPasswordPlain = "123456";
  await prisma.user.upsert({
    where: { email: adminEmail }, update: {},
    create: {
      email: adminEmail, username: "adminPrincipal", password: await bcrypt.hash(adminPasswordPlain, 10),
      phone: "+51 900 111 222", birthdate: new Date("1990-01-01"), status: "Activo", roleId: adminRole.id,
    },
  });
  console.log("✅ Usuario Administrador asegurado.");

  // =====================================================
  // 4️⃣ Crear 5 Coaches y Academias
  // =====================================================
  console.log("🏋️ Creando coaches y academias...");
  const academies = [];
  const coachPasswordPlain = "123456";
  const coachPhones = ["+51 901...", "+51 902...", "+51 903...", "+51 904...", "+51 905..."];

  for (let i = 1; i <= 5; i++) {
    const email = `dojo${i}@academy.com`;
    const username = `dojo${i}`;
    const coachUser = await prisma.user.upsert({
      where: { email: email }, update: {},
      create: {
        email, username, password: await bcrypt.hash(coachPasswordPlain, 10),
        phone: coachPhones[i-1], birthdate: new Date(`198${i}-0${i}-15`), status: "Activo", roleId: coachRole.id,
      },
    });
    let academy = await prisma.academy.findFirst({ where: { userId: coachUser.id } });
    if (!academy) {
      academy = await prisma.academy.create({ data: { name: `Academia Dojo ${i}`, userId: coachUser.id } });
    }
    academies.push(academy);
    console.log(`   Academia asegurada: ${academy.name}`);
  }
  console.log("✅ Coaches y Academias asegurados.");

  // =====================================================
  // 5️⃣ Crear Estudiantes
  // =====================================================
  console.log("🎓 Creando estudiantes...");
  const studentPasswordPlain = "123456";
  const studentNames = [
    ["Carlos", "Ramírez"], ["Lucía", "Gonzales"], ["Andrés", "Salazar"], ["María", "Fernández"],
    ["José", "Torres"], ["Camila", "López"], ["Santiago", "Huamán"], ["Valeria", "Quispe"],
    ["Renato", "Cruz"], ["Fiorella", "Campos"], ["Matías", "Arias"], ["Diana", "Mendoza"],
  ];
  let studentIndex = 0;
  for (const academy of academies) {
    for (let j = 0; j < 3; j++) {
      if (studentIndex >= studentNames.length) break;
      const [firstname, lastname] = studentNames[studentIndex];
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}@example.com`;
      const birthYear = 2010 + Math.floor(Math.random() * 8);
      const birthdate = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

      const studentUser = await prisma.user.upsert({
        where: { email }, update: {},
        create: {
          email, username: `${firstname}${lastname}`, password: await bcrypt.hash(studentPasswordPlain, 10),
          birthdate, status: "Activo", roleId: studentRole.id,
        },
      });
      const randomBelt = allBelts[Math.floor(Math.random() * allBelts.length)];
      const existingStudent = await prisma.student.findFirst({ where: { userId: studentUser.id } });
      if (existingStudent) {
        await prisma.student.update({ where: { id: existingStudent.id }, data: { beltId: randomBelt.id, academyId: academy.id } });
      } else {
        await prisma.student.create({ data: { firstname, lastname, birthdate, beltId: randomBelt.id, userId: studentUser.id, academyId: academy.id } });
      }
      console.log(`   Estudiante asegurado: ${firstname} ${lastname}`);
      studentIndex++;
    }
  }
  console.log("✅ Estudiantes asegurados.");

  // =====================================================
  // 6️⃣ Crear Campeonatos (Championships)
  // =====================================================
  console.log("🏆 Creando campeonatos...");
  const championshipsData = [
    { name: "Campeonato Nacional Universitario 2025", startDate: new Date("2025-03-15"), location: "Estadio Nacional", district: "Jesús María", province: "Lima", country: "Perú", description: "El evento cumbre...", image: "", status: "Activo", academyId: academies[0].id },
    { name: "Copa Metropolitana de Karate", startDate: new Date("2025-04-10"), location: "Coliseo Eduardo Dibós", district: "San Borja", province: "Lima", country: "Perú", description: "Competencia abierta...", image: "", status: "Próximo", academyId: academies[1].id },
    { name: "Torneo Juvenil Primavera 2025", startDate: new Date("2025-05-05"), location: "Polideportivo de Miraflores", district: "Miraflores", province: "Lima", country: "Perú", description: "¡La nueva generación...", image: "", status: "Inscripción Abierta", academyId: academies[2].id },
    { name: "Copa San Luis de Karate", startDate: new Date("2025-06-20"), location: "Complejo Deportivo San Luis", district: "San Luis", province: "Lima", country: "Perú", description: "Torneo local...", image: "", status: "Planificación", academyId: academies[3].id },
    { name: "Campeonato Internacional de Lima 2025", startDate: new Date("2025-07-15"), location: "Villa Deportiva Nacional (VIDENA)", district: "San Luis", province: "Lima", country: "Perú", description: "Evento de talla internacional...", image: "", status: "Planificación", academyId: academies[4].id },
  ];
  const createdChampionships = [];
  for (const champ of championshipsData) {
    let dbChamp = await prisma.championship.findFirst({ where: { name: champ.name } });
    if (dbChamp) {
      dbChamp = await prisma.championship.update({
        where: { id: dbChamp.id },
        data: { startDate: champ.startDate, location: champ.location, district: champ.district, province: champ.province, country: champ.country, description: champ.description, status: champ.status },
      });
    } else {
      dbChamp = await prisma.championship.create({ data: champ });
    }
    createdChampionships.push(dbChamp);
    console.log(`   Campeonato asegurado: ${dbChamp.name}`);
  }
  console.log("✅ Campeonatos asegurados.");

  // =====================================================
  // 7️⃣ Crear Rangos de Edad (AgeRange)
  // =====================================================
  console.log("👶 Creando rangos de edad...");
  const ageRangesData = [
    { label: "U14 (12-13 años)", minAge: 12, maxAge: 13 }, { label: "Cadete (14-15 años)", minAge: 14, maxAge: 15 },
    { label: "Junior (16-17 años)", minAge: 16, maxAge: 17 }, { label: "Sub-21 (18-20 años)", minAge: 18, maxAge: 20 },
    { label: "Senior (18+ años)", minAge: 18, maxAge: 99 },
  ];
  const ageRangesMap = new Map<string, number>();
  for (const range of ageRangesData) {
    let dbRange = await prisma.ageRange.findFirst({ where: { label: range.label } });
    if (dbRange) {
      dbRange = await prisma.ageRange.update({ where: { id: dbRange.id }, data: range });
    } else {
      dbRange = await prisma.ageRange.create({ data: range });
    }
    ageRangesMap.set(range.label, dbRange.id);
  }
  console.log("✅ Rangos de edad asegurados.");

  // =====================================================
  // 8️⃣ Obtener IDs de Cinturones y Campeonato
  // =====================================================
  console.log("🔍 Obteniendo IDs necesarios...");
  const brownBelt3Kyu = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 3 } });
  const blackBelt = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 0 } });
  const targetChampionshipId = createdChampionships[0].id;
  console.log(`   IDs obtenidos para Campeonato ${targetChampionshipId}, Cinturones ${brownBelt3Kyu.id}-${blackBelt.id}`);

  // =====================================================
  // 9️⃣ Crear Categorías del Campeonato con Códigos A*/B*
  // =====================================================
  console.log("📝 Creando categorías del campeonato con códigos A*/B*...");
  // 👇 Definiciones con el campo 'code' añadido
  const categoryDefinitions = [
    // --- KATA ---
    { code: "A1", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kata" },
    { code: "A2", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kata" },
    { code: "A3", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kata" },
    { code: "A4", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kata" },
    { code: "A5", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kata" },
    { code: "A6", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kata" },
    { code: "A7", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kata" },
    { code: "A8", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kata" },
    { code: "A9", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kata" },
    { code: "A10", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kata" },

    // --- KUMITE ---
    { code: "B1", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-40kg" },
    { code: "B2", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-45kg" },
    { code: "B3", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-50kg" },
    { code: "B4", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-55kg" },
    { code: "B5", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "+55kg" },
    { code: "B6", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "-42kg" },
    { code: "B7", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "-47kg" },
    { code: "B8", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "-52kg" },
    { code: "B9", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "+52kg" },
    { code: "B10", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-52kg" },
    { code: "B11", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-57kg" },
    { code: "B12", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-63kg" },
    { code: "B13", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-70kg" },
    { code: "B14", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "+70kg" }, // Peso WKF
    { code: "B15", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "-47kg" }, // Re-indexado y peso WKF
    { code: "B16", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "-54kg" }, // Re-indexado y peso WKF
    { code: "B17", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "-61kg" }, // Re-indexado y peso WKF
    { code: "B18", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "+61kg" }, // Re-indexado y peso WKF
    { code: "B19", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-55kg" }, // Re-indexado
    { code: "B20", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-61kg" }, // Re-indexado
    { code: "B21", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-68kg" }, // Re-indexado
    { code: "B22", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-76kg" }, // Re-indexado
    { code: "B23", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "+76kg" }, // Re-indexado
    { code: "B24", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-48kg" }, // Re-indexado
    { code: "B25", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-53kg" }, // Re-indexado
    { code: "B26", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-59kg" }, // Re-indexado
    { code: "B27", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-66kg" }, // Re-indexado
    { code: "B28", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "+66kg" }, // Re-indexado
    { code: "B29", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-60kg" }, // Re-indexado
    { code: "B30", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-67kg" }, // Re-indexado
    { code: "B31", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-75kg" }, // Re-indexado
    { code: "B32", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-84kg" }, // Re-indexado
    { code: "B33", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "+84kg" }, // Re-indexado
    { code: "B34", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-50kg" }, // Re-indexado
    { code: "B35", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-55kg" }, // Re-indexado
    { code: "B36", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-61kg" }, // Re-indexado
    { code: "B37", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-68kg" }, // Re-indexado
    { code: "B38", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "+68kg" }, // Re-indexado
    { code: "B39", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-60kg" }, // Re-indexado
    { code: "B40", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-67kg" }, // Re-indexado
    { code: "B41", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-75kg" }, // Re-indexado
    { code: "B42", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-84kg" }, // Re-indexado
    { code: "B43", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "+84kg" }, // Re-indexado
    { code: "B44", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-50kg" }, // Re-indexado
    { code: "B45", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-55kg" }, // Re-indexado
    { code: "B46", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-61kg" }, // Re-indexado
    { code: "B47", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-68kg" }, // Re-indexado
    { code: "B48", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "+68kg" }, // Re-indexado
  ];

  let categoriesCreatedCount = 0;
  for (const catDef of categoryDefinitions) {
    const ageRangeId = ageRangesMap.get(catDef.ageLabel);
    if (!ageRangeId) {
      console.warn(`⚠️ Rango de edad no encontrado: ${catDef.ageLabel}. Saltando cat ${catDef.code}.`);
      continue;
    }
    const categoryData = {
      championshipId: targetChampionshipId,
      modality: catDef.modality,
      gender: catDef.gender,
      ageRangeId: ageRangeId,
      beltMinId: brownBelt3Kyu.id,
      beltMaxId: blackBelt.id,
      code: catDef.code, // <-- Usamos el código A*/B*
    };
    await prisma.championshipCategory.upsert({
      where: {
        championshipId_modality_gender_ageRangeId_beltMinId_beltMaxId: {
          championshipId: categoryData.championshipId, modality: categoryData.modality, gender: categoryData.gender,
          ageRangeId: categoryData.ageRangeId, beltMinId: categoryData.beltMinId, beltMaxId: categoryData.beltMaxId,
        },
      },
      update: { code: categoryData.code }, // <-- Actualizamos el código si ya existe
      create: categoryData,
    });
    categoriesCreatedCount++;
  }
  console.log(`✅ ${categoriesCreatedCount} categorías aseguradas con códigos A*/B*.`);

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