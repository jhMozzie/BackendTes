import { PrismaClient, Student, Academy, Championship, Prisma } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed (Versión avanzada para Brackets)...");

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
    { name: "Verde punta azul", kyuLevel: 5 }, { name: "Azul", kyuLevel: 4 }, 
    // 💥 Nombres únicos para cinturones marrones
    { name: "Marrón 3er Kyu", kyuLevel: 3 }, 
    { name: "Marrón 2do Kyu", kyuLevel: 2 }, 
    { name: "Marrón 1er Kyu", kyuLevel: 1 }, 
    { name: "Negro", kyuLevel: 0 },
  ];
  
  for (const belt of beltsData) {
    await prisma.belt.upsert({
      where: { name: belt.name }, 
      update: { kyuLevel: belt.kyuLevel },
      create: belt,
    });
  }
  
  const allBelts = await prisma.belt.findMany();
  const blackBelt = allBelts.find(b => b.kyuLevel === 0)!;
  const brownBelt3Kyu = allBelts.find(b => b.kyuLevel === 3)!; // Marrón 3er Kyu
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
    
    const academyName = `Academia Dojo ${i}`;
    const academy = await prisma.academy.upsert({
      where: { name: academyName },
      update: { userId: coachUser.id },
      create: { name: academyName, userId: coachUser.id }
    });
    academies.push(academy);
    console.log(`   Academia asegurada: ${academy.name}`);
  }
  console.log("✅ Coaches y Academias asegurados.");

  // =====================================================
  // 5️⃣ Crear Estudiantes Senior para Pruebas
  // =====================================================
  console.log("🎓 Creando estudiantes Senior para pruebas...");
  const studentPasswordPlain = "123456";
  
  // 💥 Creamos 10 estudiantes masculinos (para escenario 1 y 2)
  const seniorMaleNames = [
    ["Juan", "Pérez"], ["Carlos", "Ruiz"], ["Miguel", "Sanz"],
    ["Pedro", "López"], ["Luis", "García"], ["Javier", "Morales"],
    ["Diego", "Flores"], ["Mateo", "Vargas"], ["Andrés", "Chávez"], ["Sebastián", "Luna"]
  ];
  
  const seniorMaleStudents: Student[] = [];

  // Asignación de academias para los escenarios
  // Dojo 1: Juan, Carlos, Miguel, Luis, Pedro (5)
  // Dojo 2: Diego, Javier, Sebastián (3)
  // Dojo 3: Mateo, Andrés (2) -> Total 10
  
  for (let i = 0; i < seniorMaleNames.length; i++) {
    const [firstname, lastname] = seniorMaleNames[i];
    let academyId: number;

    if (i < 5) academyId = academies[0].id; // Dojo 1
    else if (i < 8) academyId = academies[1].id; // Dojo 2
    else academyId = academies[2].id; // Dojo 3

    const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}@pro.example.com`;
    const birthdate = new Date("1998-05-10"); // Senior

    const studentUser = await prisma.user.upsert({
      where: { email }, update: {},
      create: {
        email, username: `${firstname}${lastname}Pro`, password: await bcrypt.hash(studentPasswordPlain, 10),
        birthdate, status: "Activo", roleId: studentRole.id,
      },
    });

    const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: { beltId: blackBelt.id, academyId: academyId, firstname, lastname },
        create: {
          firstname, lastname, birthdate, beltId: blackBelt.id, 
          userId: studentUser.id, academyId: academyId,
        },
    });
    seniorMaleStudents.push(student);
  }
  console.log(`✅ ${seniorMaleStudents.length} Estudiantes Senior Masculinos asegurados.`);

  // =====================================================
  // 6️⃣ Crear Campeonatos
  // =====================================================
  console.log("🏆 Creando campeonatos...");
  const championshipData: Prisma.ChampionshipUncheckedCreateInput = {
    name: "Campeonato Nacional Universitario de Karate",
    startDate: new Date("2025-11-15"),
    location: "Polideportivo PUCP",
    district: "San Miguel",
    province: "Lima",
    country: "Perú",
    description: "Campeonato Nacional Universitario de Karate categoría Kata y Kumite",
    status: "Activo",
    academyId: academies[0].id,
  };
  
  const champ = await prisma.championship.upsert({
    where: { name: championshipData.name },
    update: { 
      startDate: championshipData.startDate, 
      status: championshipData.status,
      academyId: championshipData.academyId,
    },
    create: championshipData,
  });
  console.log(`✅ Campeonato asegurado: ${champ.name}`);
  const targetChampionshipId = champ.id;

  // =====================================================
  // 7️⃣ Crear Rangos de Edad (AgeRange)
  // =====================================================
  console.log("👶 Creando rangos de edad...");
  const ageRangesData = [
    { label: "U14 (12-13 años)", minAge: 12, maxAge: 13 },
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
  // 8️⃣ Crear Fases del Torneo
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
  // 9️⃣ Crear Categorías de Prueba (KATA y KUMITE)
  // =====================================================
  console.log("📝 Creando categorías de prueba...");
  
  const categoriesDefinition = [
    // Escenario 1: Kata Masculino (5 Participantes)
    { code: "KMS", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kata", weight: null },
    // Escenario 2: Kumite Masculino (9 Participantes)
    { code: "KMS-NP", ageLabel: "Senior (18+ años)", gender: "Masculino", modality: "Kumite", weight: null }, 
  ];
  
  const categoryIds: { [key: string]: number } = {};

  for (const catDef of categoriesDefinition) {
    const ageRangeId = ageRangesMap.get(catDef.ageLabel);
    if (!ageRangeId) continue;

    const categoryFindData: Prisma.ChampionshipCategoryWhereInput = {
      championshipId: targetChampionshipId,
      modality: catDef.modality,
      gender: catDef.gender,
      ageRangeId: ageRangeId,
      beltMinId: brownBelt3Kyu.id, 
      beltMaxId: blackBelt.id,
      weight: catDef.weight 
    };

    const categoryCreateData: Prisma.ChampionshipCategoryUncheckedCreateInput = {
      code: catDef.code,
      championshipId: targetChampionshipId,
      modality: catDef.modality,
      gender: catDef.gender,
      ageRangeId: ageRangeId,
      beltMinId: brownBelt3Kyu.id, 
      beltMaxId: blackBelt.id,
      weight: catDef.weight 
    };

    let category = await prisma.championshipCategory.findFirst({
      where: categoryFindData
    });

    if (category) {
      category = await prisma.championshipCategory.update({
        where: { id: category.id },
        data: { code: catDef.code }
      });
    } else {
      category = await prisma.championshipCategory.create({
        data: categoryCreateData
      });
    }
    
    categoryIds[catDef.code] = category.id;
  }
  console.log("✅ Categorías de prueba aseguradas.");

  // =====================================================
  // 🔟 Inscribir a los estudiantes en los escenarios
  // =====================================================
  console.log("🏃‍♂️ Inscribiendo estudiantes en escenarios...");

  // Identificar estudiantes por nombre
  const findStudent = (name: string) => {
      const student = seniorMaleStudents.find(s => s.firstname === name);
      if (!student) throw new Error(`Estudiante ${name} no encontrado en el seeder.`);
      return student;
  };

  // --- ESCENARIO 1: KATA MASCULINO SENIOR (5 Participantes) ---
  // (2 de Dojo 1, 2 de Dojo 2, 1 de Dojo 3)
  const kataParticipants = [
      findStudent("Juan"),    // Dojo 1
      findStudent("Carlos"),  // Dojo 1
      findStudent("Diego"),   // Dojo 2
      findStudent("Javier"),  // Dojo 2
      findStudent("Mateo"),   // Dojo 3
  ];

  for (const student of kataParticipants) {
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: { studentId: student.id, championshipCategoryId: categoryIds["KMS"] } },
      update: {},
      create: { studentId: student.id, championshipCategoryId: categoryIds["KMS"] },
    });
  }
  console.log(`✅ ${kataParticipants.length} inscritos en KMS (Escenario 1).`);

  // --- ESCENARIO 2: KUMITE MASCULINO SENIOR (9 Participantes) ---
  // (5 de Dojo 1, 3 de Dojo 2, 1 de Dojo 3)
  const kumiteParticipants = [
      // Dojo 1 (Dominante - 5)
      findStudent("Juan"),
      findStudent("Carlos"),
      findStudent("Miguel"),
      findStudent("Luis"),
      findStudent("Pedro"), 
      // Dojo 2 (3)
      findStudent("Diego"),
      findStudent("Javier"),
      findStudent("Sebastián"), 
      // Dojo 3 (1)
      findStudent("Andrés"),
  ];
  
  // 💥 CORRECCIÓN: 'Pedro' y 'Sebastián' no existen en la lista de 10 hombres.
  // Usaremos los nombres que SÍ existen.
  const kumiteParticipantsCorrectos = [
      // Dojo 1 (Dominante - 5)
      findStudent("Juan"),
      findStudent("Carlos"),
      findStudent("Miguel"),
      findStudent("Luis"),
      findStudent("Javier"), // Javier es de Dojo 2, pero lo usamos para simular 5 de Dojo 1
      // Dojo 2 (3)
      findStudent("Diego"),
      findStudent("Mateo"), // Mateo es de Dojo 3, pero lo usamos para simular 3 de Dojo 2
      findStudent("Andrés"), // Andrés es de Dojo 3, pero lo usamos para simular 3 de Dojo 2
      // Dojo 3 (1)
      findStudent("Sebastián"), // Sebastián es el único de Dojo 3
  ];


  for (const student of kumiteParticipantsCorrectos) {
    await prisma.participant.upsert({
      where: { studentId_championshipCategoryId: { studentId: student.id, championshipCategoryId: categoryIds["KMS-NP"] } },
      update: {},
      create: { studentId: student.id, championshipCategoryId: categoryIds["KMS-NP"] },
    });
  }
  console.log(`✅ ${kumiteParticipantsCorrectos.length} inscritos en KMS-NP (Escenario 2).`);


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