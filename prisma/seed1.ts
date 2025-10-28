import { PrismaClient, Student, Academy, Championship, Prisma } from "../src/generated/prisma";
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
  // Usamos findFirst + create
  for (const role of roles) {
    const existing = await prisma.role.findFirst({
      where: { description: role.description },
    });
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
  const blackBelt = allBelts.find(b => b.kyuLevel === 0);
  if (!blackBelt) throw new Error("❌ No se encontró el cinturón Negro (kyuLevel 0).");
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
  const academies: Academy[] = [];
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
  // 5️⃣ Crear Estudiantes Senior para Pruebas
  // =====================================================
  console.log("🎓 Creando estudiantes Senior para pruebas...");
  const studentPasswordPlain = "123456";
  const seniorMaleNames = [
    ["Juan", "Pérez"], ["Carlos", "Ruiz"], ["Miguel", "Sanz"],
    ["Pedro", "López"], ["Luis", "García"], ["Javier", "Morales"]
  ];
  const seniorFemaleNames = [
    ["Ana", "Sánchez"], ["María", "González"], ["Lucía", "Fernández"],
    ["Elena", "Díaz"], ["Sofía", "Romero"], ["Carla", "Navarro"]
  ];
  
  const seniorMaleStudents: Student[] = [];
  const seniorFemaleStudents: Student[] = [];

  // Crear 6 Estudiantes Masculinos Senior (Academia 1)
  for (const [firstname, lastname] of seniorMaleNames) {
    const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}@pro.example.com`;
    const birthdate = new Date("1998-05-10"); // Senior

    const studentUser = await prisma.user.upsert({
      where: { email }, update: {},
      create: {
        email, username: `${firstname}${lastname}Pro`, password: await bcrypt.hash(studentPasswordPlain, 10),
        birthdate, status: "Activo", roleId: studentRole.id,
      },
    });

    const existingStudent = await prisma.student.findFirst({ where: { userId: studentUser.id } });
    let student: Student;
    if (existingStudent) {
      student = await prisma.student.update({
        where: { id: existingStudent.id },
        data: { beltId: blackBelt.id, academyId: academies[0].id },
      });
    } else {
      student = await prisma.student.create({
        data: {
          firstname, lastname, birthdate, beltId: blackBelt.id, 
          userId: studentUser.id, academyId: academies[0].id,
        },
      });
    }
    seniorMaleStudents.push(student);
    console.log(`   Estudiante Senior Masc. asegurado: ${firstname} ${lastname}`);
  }

  // Crear 6 Estudiantes Femeninos Senior (Academia 2)
  for (const [firstname, lastname] of seniorFemaleNames) {
    const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}@pro.example.com`;
    const birthdate = new Date("1999-07-15"); // Senior

    const studentUser = await prisma.user.upsert({
      where: { email }, update: {},
      create: {
        email, username: `${firstname}${lastname}Pro`, password: await bcrypt.hash(studentPasswordPlain, 10),
        birthdate, status: "Activo", roleId: studentRole.id,
      },
    });
    
    const existingStudent = await prisma.student.findFirst({ where: { userId: studentUser.id } });
    let student: Student;
    if (existingStudent) {
      student = await prisma.student.update({
        where: { id: existingStudent.id },
        data: { beltId: blackBelt.id, academyId: academies[1].id },
      });
    } else {
      student = await prisma.student.create({
        data: {
          firstname, lastname, birthdate, beltId: blackBelt.id,
          userId: studentUser.id, academyId: academies[1].id,
        },
      });
    }
    seniorFemaleStudents.push(student);
    console.log(`   Estudiante Senior Fem. asegurada: ${firstname} ${lastname}`);
  }
  console.log("✅ 12 Estudiantes Senior (6M/6F) asegurados.");

  // =====================================================
  // 6️⃣ Crear Campeonatos (Championships)
  // =====================================================
  console.log("🏆 Creando campeonatos...");
  const championshipsData: Prisma.ChampionshipUncheckedCreateInput[] = [
    { name: "Campeonato Nacional Universitario 2025", startDate: new Date("2025-03-15"), location: "Estadio Nacional", district: "Jesús María", province: "Lima", country: "Perú", description: "El evento cumbre...", image: "", status: "Activo", academyId: academies[0].id },
    { name: "Copa Metropolitana de Karate", startDate: new Date("2025-04-10"), location: "Coliseo Eduardo Dibós", district: "San Borja", province: "Lima", country: "Perú", description: "Competencia abierta...", image: "", status: "Próximo", academyId: academies[1].id },
    { name: "Torneo Juvenil Primavera 2025", startDate: new Date("2025-05-05"), location: "Polideportivo de Miraflores", district: "Miraflores", province: "Lima", country: "Perú", description: "¡La nueva generación...", image: "", status: "Inscripción Abierta", academyId: academies[2].id },
    { name: "Copa San Luis de Karate", startDate: new Date("2025-06-20"), location: "Complejo Deportivo San Luis", district: "San Luis", province: "Lima", country: "Perú", description: "Torneo local...", image: "", status: "Planificación", academyId: academies[3].id },
    { name: "Campeonato Internacional de Lima 2025", startDate: new Date("2025-07-15"), location: "Villa Deportiva Nacional (VIDENA)", district: "San Luis", province: "Lima", country: "Perú", description: "Evento de talla internacional...", image: "", status: "Planificación", academyId: academies[4].id },
  ];
  const createdChampionships: Championship[] = [];
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
  const targetChampionshipId = createdChampionships[0].id;
  console.log(`   IDs obtenidos para Campeonato ${targetChampionshipId}, Cinturones ${brownBelt3Kyu.id}-${blackBelt.id}`);

  // =====================================================
  // 9️⃣ Crear Categorías del Campeonato con Códigos A*/B*
  // =====================================================
  console.log("📝 Creando categorías del campeonato con códigos A*/B*...");
  
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
  
    // --- KUMITE U14 ---
    { code: "B1", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-40kg" },
    { code: "B2", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-45kg" },
    { code: "B3", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-50kg" },
    { code: "B4", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "-55kg" },
    { code: "B5", ageLabel: "U14 (12-13 años)", gender: "Masculino", modality: "Kumite", weight: "+55kg" },
    { code: "B6", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "-42kg" },
    { code: "B7", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "-47kg" },
    { code: "B8", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "-52kg" },
    { code: "B9", ageLabel: "U14 (12-13 años)", gender: "Femenino", modality: "Kumite", weight: "+52kg" },
    // --- KUMITE CADETE ---
    { code: "B10", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-52kg" },
    { code: "B11", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-57kg" },
    { code: "B12", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-63kg" },
    { code: "B13", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "-70kg" },
    { code: "B14", ageLabel: "Cadete (14-15 años)", gender: "Masculino", modality: "Kumite", weight: "+70kg" },
    { code: "B15", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "-47kg" },
    { code: "B16", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "-54kg" },
    { code: "B17", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "-61kg" },
    { code: "B18", ageLabel: "Cadete (14-15 años)", gender: "Femenino", modality: "Kumite", weight: "+61kg" },
    // --- KUMITE JUNIOR ---
    { code: "B19", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-55kg" },
    { code: "B20", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-61kg" },
    { code: "B21", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-68kg" },
    { code: "B22", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "-76kg" },
    { code: "B23", ageLabel: "Junior (16-17 años)", gender: "Masculino", modality: "Kumite", weight: "+76kg" },
    { code: "B24", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-48kg" },
    { code: "B25", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-53kg" },
    { code: "B26", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-59kg" },
    { code: "B27", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "-66kg" },
    { code: "B28", ageLabel: "Junior (16-17 años)", gender: "Femenino", modality: "Kumite", weight: "+66kg" },
    // --- KUMITE SUB-21 ---
    { code: "B29", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-60kg" },
    { code: "B30", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-67kg" },
    { code: "B31", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-75kg" },
    { code: "B32", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "-84kg" },
    { code: "B33", ageLabel: "Sub-21 (18-20 años)", gender: "Masculino", modality: "Kumite", weight: "+84kg" },
    { code: "B34", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-50kg" },
    { code: "B35", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-55kg" },
    { code: "B36", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-61kg" },
    { code: "B37", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "-68kg" },
    { code: "B38", ageLabel: "Sub-21 (18-20 años)", gender: "Femenino", modality: "Kumite", weight: "+68kg" },
    // --- KUMITE SENIOR ---
    { code: "B39", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-60kg" },
    { code: "B40", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-67kg" },
    { code: "B41", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-75kg" },
    { code: "B42", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "-84kg" },
    { code: "B43", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: "+84kg" },
    { code: "B44", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-50kg" },
    { code: "B45", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-55kg" },
    { code: "B46", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-61kg" },
    { code: "B47", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "-68kg" },
    { code: "B48", ageLabel: "Senior (18+ años)", gender: "Femenino", modality: "Kumite", weight: "+68kg" },
  ];

  let categoriesCreatedCount = 0;
  let categoriesUpdatedCount = 0;

  for (const catDef of categoryDefinitions) {
    const ageRangeId = ageRangesMap.get(catDef.ageLabel);
    if (!ageRangeId) {
      console.warn(`⚠️ Rango de edad no encontrado: ${catDef.ageLabel}. Saltando cat ${catDef.code}.`);
      continue;
    }

    const categoryUniqueData = {
      championshipId: targetChampionshipId,
      modality: catDef.modality,
      gender: catDef.gender,
      ageRangeId: ageRangeId,
      beltMinId: brownBelt3Kyu.id,
      beltMaxId: blackBelt.id,
      weight: catDef.weight ?? null,
    };
    
    const categoryFullData = { ...categoryUniqueData, code: catDef.code };

    // Usamos findFirst porque findUnique da error con 'null' en la clave
    const existingCategory = await prisma.championshipCategory.findFirst({
      where: categoryUniqueData,
      select: { id: true, code: true }
    });

    if (existingCategory) {
      if (existingCategory.code !== catDef.code) {
        await prisma.championshipCategory.update({
          where: { id: existingCategory.id },
          data: { code: catDef.code },
        });
        categoriesUpdatedCount++;
      }
    } else {
      await prisma.championshipCategory.create({
        data: categoryFullData,
      });
      categoriesCreatedCount++;
    }
  }
  console.log(`✅ Categorías procesadas: ${categoriesCreatedCount} creadas, ${categoriesUpdatedCount} actualizadas.`);
  console.log(`✅ Total de ${categoryDefinitions.length} categorías aseguradas con códigos A*/B*.`);


  // =====================================================
  // 🔟 NUEVO: Crear Participantes (Participants)
  // =====================================================
  console.log("🏃‍♂️ Inscribiendo participantes Senior...");
  let participantsCreatedCount = 0;
  
  const ageRangeSeniorId = ageRangesMap.get("Senior (18+ años)");
  if (!ageRangeSeniorId) throw new Error("❌ No se encontró el AgeRange Senior.");

  // Buscamos las 4 categorías Senior (usamos findFirstOrThrow para asegurar que existen)
  const kataMascSenior = await prisma.championshipCategory.findFirstOrThrow({
    where: { championshipId: targetChampionshipId, code: "A9" } // Kata Masc Senior
  });
  const kataFemSenior = await prisma.championshipCategory.findFirstOrThrow({
    where: { championshipId: targetChampionshipId, code: "A10" } // Kata Fem Senior
  });
  const kumiteMascSenior = await prisma.championshipCategory.findFirstOrThrow({
    where: { championshipId: targetChampionshipId, code: "B41" } // Kumite Masc Senior -75kg
  });
  const kumiteFemSenior = await prisma.championshipCategory.findFirstOrThrow({
    where: { championshipId: targetChampionshipId, code: "B46" } // Kumite Fem Senior -61kg
  });
  console.log("   IDs de categorías Senior objetivo obtenidos.");

  // Inscribir 6 Hombres en Kata Senior (A9)
  for (let i = 0; i < 6; i++) {
    const studentId = seniorMaleStudents[i].id;
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: { studentId: studentId, championshipCategoryId: kataMascSenior.id } },
      update: {}, create: { studentId: studentId, championshipCategoryId: kataMascSenior.id },
    });
    participantsCreatedCount++;
  }
  // Inscribir 6 Hombres en Kumite Senior (B41)
  for (let i = 0; i < 6; i++) {
    const studentId = seniorMaleStudents[i].id;
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: { studentId: studentId, championshipCategoryId: kumiteMascSenior.id } },
      update: {}, create: { studentId: studentId, championshipCategoryId: kumiteMascSenior.id },
    });
    participantsCreatedCount++;
  }
  // Inscribir 6 Mujeres en Kata Senior (A10)
  for (let i = 0; i < 6; i++) {
    const studentId = seniorFemaleStudents[i].id;
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: { studentId: studentId, championshipCategoryId: kataFemSenior.id } },
      update: {}, create: { studentId: studentId, championshipCategoryId: kataFemSenior.id },
    });
    participantsCreatedCount++;
  }
  // Inscribir 6 Mujeres en Kumite Senior (B46)
  for (let i = 0; i < 6; i++) {
    const studentId = seniorFemaleStudents[i].id;
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: { studentId: studentId, championshipCategoryId: kumiteFemSenior.id } },
      update: {}, create: { studentId: studentId, championshipCategoryId: kumiteFemSenior.id },
    });
    participantsCreatedCount++;
  }
  console.log(`✅ ${participantsCreatedCount} inscripciones (Participantes) creadas/aseguradas.`);


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