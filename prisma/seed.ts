import { PrismaClient, Academy, Championship, Prisma } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

// Helper para obtener un elemento aleatorio de un array
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================================
// DATOS COMUNES
// =====================================================

const maleNames = [
  "Juan", "Carlos", "Miguel", "Pedro", "Luis", "Javier", "Diego", "Mateo",
  "Andrés", "Sebastián", "Fernando", "Roberto", "Raúl", "César", "Víctor",
  "Manuel", "Jorge", "Ricardo", "Antonio", "Alberto", "Óscar", "Daniel"
];

const femaleNames = [
  "María", "Ana", "Carmen", "Rosa", "Patricia", "Laura", "Sofía", "Valentina",
  "Isabella", "Camila", "Lucía", "Daniela", "Gabriela", "Andrea", "Carolina",
  "Fernanda", "Natalia", "Paula", "Alejandra", "Beatriz", "Elena", "Victoria"
];

const lastNames = [
  "García", "Rodríguez", "Martínez", "López", "González", "Pérez", "Sánchez",
  "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales",
  "Reyes", "Jiménez", "Hernández", "Ruiz", "Vargas", "Castro", "Ortiz"
];

// Mínimo 8, Máximo 14 competidores por categoría
const MIN_PARTICIPANTS = 8;
const MAX_PARTICIPANTS = 14;

// =====================================================
// MAIN SEED - CREACIÓN DE INFRAESTRUCTURA BASE Y DATOS INICIALES
// =====================================================

async function main() {
  console.log("🌱 Iniciando seed general...");

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
    await prisma.role.upsert({
      where: { description: role.description },
      update: {},
      create: role,
    });
  }
  const adminRole = await prisma.role.findFirstOrThrow({ where: { description: "Administrador" } });
  const coachRole = await prisma.role.findFirstOrThrow({ where: { description: "Entrenador" } });
  const studentRole = await prisma.role.findFirstOrThrow({ where: { description: "Estudiante" } });
  const coachPassword = await bcrypt.hash("123456", 10);
  console.log("✅ Roles base creados.");

  // =====================================================
  // 2️⃣ Crear Cinturones (Belts) y definir Rangos de Nivel
  // =====================================================
  console.log("🥋 Creando cinturones...");
  const beltsData = [
    { name: "Blanco 10mo Kyu", kyuLevel: 10 }, // Básico (Min)
    { name: "Amarillo 9no Kyu", kyuLevel: 9 },
    { name: "Naranja 8vo Kyu", kyuLevel: 8 }, // Básico (Max)

    { name: "Naranja Punta Verde 7mo Kyu", kyuLevel: 7 }, // Intermedio (Min)
    { name: "Verde 6to Kyu", kyuLevel: 6 },
    { name: "Azul 5to Kyu", kyuLevel: 5 },
    { name: "Azul Punta Marrón 4to Kyu", kyuLevel: 4 }, // Intermedio (Max)

    { name: "Marrón 3er Kyu", kyuLevel: 3 }, // Avanzado (Min)
    { name: "Marrón 2do Kyu", kyuLevel: 2 },
    { name: "Marrón 1er Kyu", kyuLevel: 1 },
    { name: "Negro", kyuLevel: 0 }, // Avanzado (Max)
  ];

  for (const belt of beltsData) {
    await prisma.belt.upsert({
      where: { name: belt.name },
      update: { kyuLevel: belt.kyuLevel },
      create: belt,
    });
  }

  // Definición de rangos de cinturón para categorías
  const basicMin = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 10 } });
  const basicMax = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 8 } });
  const intermediateMin = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 7 } });
  const intermediateMax = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 4 } });
  const advancedMin = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 3 } });
  const advancedMax = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 0 } });
  
  const belts = { basicMin, basicMax, intermediateMin, intermediateMax, advancedMin, advancedMax };

  console.log("✅ 11 Cinturones creados.");

  // =====================================================
  // 3️⃣ Usuario Administrador
  // =====================================================
  console.log("👑 Creando usuario administrador...");
  const adminPassword = await bcrypt.hash("123456", 10);
  await prisma.user.upsert({
    where: { email: "admin@karate.pe" },
    update: {},
    create: {
      email: "admin@karate.pe",
      username: "admin",
      password: adminPassword,
      phone: "+51 999 000 000",
      birthdate: new Date("1985-01-01"),
      status: "Activo",
      gender: "M", // 👈 Género del administrador
      roleId: adminRole.id,
    },
  });
  console.log("✅ Administrador: admin@karate.pe / 123456");

  // =====================================================
  // 4️⃣ Crear Rangos de Edad (Senior/Mayor)
  // =====================================================
  console.log("👶 Creando rango Senior (Mayores)...");
  const ageRangesData = [
    { label: "Infantil (6-9 años)", minAge: 6, maxAge: 9 },
    { label: "Cadete (10-13 años)", minAge: 10, maxAge: 13 },
    { label: "Junior (14-17 años)", minAge: 14, maxAge: 17 },
    { label: "Senior (18+ años)", minAge: 18, maxAge: 99 },
  ];
  
  for (const range of ageRangesData) {
    await prisma.ageRange.upsert({
      where: { label: range.label },
      update: range,
      create: range,
    });
  }
  
  const seniorRange = await prisma.ageRange.findFirstOrThrow({ 
    where: { label: "Senior (18+ años)" } 
  });
  console.log("✅ Rango Senior creado.");

  // =====================================================
  // 5️⃣ Crear Fases del Torneo
  // =====================================================
  console.log("🏅 Creando fases del torneo...");
  const phasesData = [
    { description: "Dieciseisavos de Final", order: 1 },
    { description: "Octavos de Final", order: 2 },
    { description: "Cuartos de Final", order: 3 },
    { description: "Semifinal", order: 4 },
    { description: "Final (Oro)", order: 5 },
    { description: "Combate por el Bronce", order: 6 },
  ];
  
  for (const phase of phasesData) {
    await prisma.phase.upsert({
      where: { order: phase.order },
      update: { description: phase.description },
      create: phase,
    });
  }
  console.log("✅ 6 Fases creadas.");

  // =====================================================
  // 6️⃣ Crear Academias (Clubes y Universidades)
  // =====================================================
  
  // Academias Nacionales (Clubes) del seed original
  const nationalAcademiesData = [
    { name: "Doryoku Kenshin Karate Do", coach: "Juan Velazco", email: "jvelazco@karate.pe", gender: "M" },
    { name: "Club Regatas Lima", coach: "Edwin Asereto", email: "easereto@karate.pe", gender: "M" },
    { name: "AKD", coach: "Mallory Aco", email: "maco@karate.pe", gender: "F" },
    { name: "Duverli", coach: "Gabriel Serrano", email: "gserrano@karate.pe", gender: "M" },
    { name: "Total Training Academy", coach: "Joseph Flores", email: "jflores@karate.pe", gender: "M" },
  ];

  // Nuevas Academias (Universidades) para el Tope
  const universityAcademiesData = [
    { name: "Universidad Norbert Wiener", coach: "Rolly Lopez", email: "rlopez@gmail.com", gender: "M" },
    { name: "Universidad Cesar Vallejo", coach: "Kelly Castillo", email: "kcastillo@gmail.com", gender: "F" },
    { name: "Universidad Peruana de Ciencias Aplicadas (UPC)", coach: "Susana Bojaico", email: "sbojaico@gmail.com", gender: "F" },
    { name: "Universidad San Ignacio de Loyola (USIL)", coach: "Jesus Tapia", email: "jtapia@gmail.com", gender: "M" },
    { name: "Universidad Autonoma del Peru", coach: "Santino Rios", email: "srios@gmail.com", gender: "M" },
  ];
  
  const allAcademiesData = [...nationalAcademiesData, ...universityAcademiesData];
  const allAcademies: Academy[] = [];
  
  console.log("🏋️ Creando entrenadores y academias...");

  for (const academyData of allAcademiesData) {
    const coachUser = await prisma.user.upsert({
      where: { email: academyData.email },
      update: {},
      create: {
        email: academyData.email,
        username: academyData.email.split("@")[0],
        password: coachPassword,
        phone: "+51 900 000 000",
        birthdate: new Date("1980-01-01"),
        status: "Activo",
        gender: academyData.gender as "M" | "F", // 👈 Género del entrenador
        roleId: coachRole.id,
      },
    });

    const academy = await prisma.academy.upsert({
      where: { name: academyData.name },
      update: { userId: coachUser.id },
      create: { 
        name: academyData.name, 
        userId: coachUser.id 
      },
    });
    
    allAcademies.push(academy);
    console.log(`   ✓ ${academy.name} - ${academyData.coach}`);
  }
  const universityAcademies = allAcademies.slice(nationalAcademiesData.length);
  const nationalAcademies = allAcademies.slice(0, nationalAcademiesData.length);
  console.log(`✅ ${allAcademies.length} Academias/Universidades creadas.`);
  
  // =====================================================
  // 7️⃣ Crear Campeonato Nacional
  // =====================================================
  
  const championshipNacional = await seedChampionship(
    "Campeonato Nacional de Karate - Elite Senior 2025",
    "2025-12-01",
    "Finalizado",
    nationalAcademies, // Solo academias clubes
    seniorRange,
    belts,
    coachRole,
    studentRole,
    coachPassword
  );

  // =====================================================
  // 8️⃣ Crear Tope InterUniversidades
  // =====================================================
  
  const championshipUniversitario = await seedChampionship(
    "Tope InterUniversidades de Karate - Senior",
    "2025-11-15",
    "En Curso",
    universityAcademies, // Solo academias universidades
    seniorRange,
    belts,
    coachRole,
    studentRole,
    coachPassword,
    true // Es un tope universitario
  );

  // =====================================================
  // FIN
  // =====================================================
  console.log("\n🎉 Seed completado con éxito!\n");
  console.log("════════════════════════════════════════════════");
  console.log("📋 RESUMEN GENERAL:");
  console.log("════════════════════════════════════════════════");
  console.log(`Campeonatos creados: 2`);
  console.log(`  - 🏆 ${championshipNacional.name}`);
  console.log(`  - 🎓 ${championshipUniversitario.name}`);
  console.log(`\nTotal de Academias/Universidades: ${allAcademies.length}`);
  console.log(`Total de Estudiantes creados: ${totalStudentsCreated}`);
  console.log("════════════════════════════════════════════════");
}

let totalStudentsCreated = 0; // Contador global de estudiantes

// =====================================================
// FUNCIÓN PARA CREAR CAMPEONATO, CATEGORÍAS Y PARTICIPANTES
// =====================================================

async function seedChampionship(
  name: string, 
  startDateStr: string, 
  status: 'Inscripción Abierta' | 'En Curso' | 'Finalizado' | 'Activo' | 'Planificación' | 'Próximo',
  academies: Academy[],
  seniorRange: { id: number },
  belts: { 
    basicMin: { id: number; kyuLevel?: number }, basicMax: { id: number; kyuLevel?: number }, 
    intermediateMin: { id: number; kyuLevel?: number }, intermediateMax: { id: number; kyuLevel?: number }, 
    advancedMin: { id: number; kyuLevel?: number }, advancedMax: { id: number; kyuLevel?: number }
  },
  coachRole: { id: number },
  studentRole: { id: number },
  coachPassword: string,
  isUniversityEvent: boolean = false
): Promise<Championship> {
  
  console.log(`\n\n=====================================================`);
  console.log(`🏆 Iniciando Seed para: ${name}`);
  console.log(`=====================================================`);

  const championshipData: Prisma.ChampionshipUncheckedCreateInput = {
    name: name,
    startDate: new Date(startDateStr),
    location: isUniversityEvent ? "Campus UNMSM" : "Polideportivo Nacional",
    district: isUniversityEvent ? "Cercado de Lima" : "San Miguel",
    province: "Lima",
    country: "Perú",
    description: isUniversityEvent ? "Tope preparatorio interuniversidades." : "Campeonato Nacional - Modalidades Kata y Kumite.",
    status: status,
    // Asignar el campeonato a la primera academia de la lista o a la primera existente.
    academyId: academies[0].id, 
    referees: 12,
    tatamis: 4,
  };
  
  const championship = await prisma.championship.upsert({
    where: { name: championshipData.name },
    update: { 
      startDate: championshipData.startDate,
      status: championshipData.status,
    },
    create: championshipData,
  });
  console.log(`✅ Campeonato: ${championship.name}`);

  // 1. DEFINICIÓN DE CATEGORÍAS (KATA y KUMITE x NIVEL)
  
  interface CategoryDefinition {
    level: "Básico" | "Intermedio" | "Avanzado";
    beltMinId: number;
    beltMaxId: number;
    beltMinKyu: number;
    beltMaxKyu: number;
    codeSuffix: string;
  }

  const levelDefinitions: CategoryDefinition[] = [
  { level: "Básico", beltMinId: belts.basicMin.id, beltMaxId: belts.basicMax.id, beltMinKyu: belts.basicMin.kyuLevel as number, beltMaxKyu: belts.basicMax.kyuLevel as number, codeSuffix: "BAS" },
  { level: "Intermedio", beltMinId: belts.intermediateMin.id, beltMaxId: belts.intermediateMax.id, beltMinKyu: belts.intermediateMin.kyuLevel as number, beltMaxKyu: belts.intermediateMax.kyuLevel as number, codeSuffix: "INT" },
  { level: "Avanzado", beltMinId: belts.advancedMin.id, beltMaxId: belts.advancedMax.id, beltMinKyu: belts.advancedMin.kyuLevel as number, beltMaxKyu: belts.advancedMax.kyuLevel as number, codeSuffix: "ADV" },
  ];
  
  const categoriesToCreate: { 
    code: string, 
    modality: string, 
    gender: string, 
    label: string, 
    level: CategoryDefinition 
  }[] = [];

  for (const levelDef of levelDefinitions) {
    // Kata Femenino
    categoriesToCreate.push({
      code: `KF-${levelDef.codeSuffix}`,
      modality: "Kata",
      gender: "Femenino",
      label: `Kata Femenino Senior - ${levelDef.level}`,
      level: levelDef
    });
    // Kata Masculino
    categoriesToCreate.push({
      code: `KM-${levelDef.codeSuffix}`,
      modality: "Kata",
      gender: "Masculino",
      label: `Kata Masculino Senior - ${levelDef.level}`,
      level: levelDef
    });
    // Kumite Femenino
    categoriesToCreate.push({
      code: `KuF-${levelDef.codeSuffix}-OPEN`,
      modality: "Kumite",
      gender: "Femenino",
      label: `Kumite Femenino Senior Open - ${levelDef.level}`,
      level: levelDef
    });
    // Kumite Masculino
    categoriesToCreate.push({
      code: `KuM-${levelDef.codeSuffix}-OPEN`,
      modality: "Kumite",
      gender: "Masculino",
      label: `Kumite Masculino Senior Open - ${levelDef.level}`,
      level: levelDef
    });
  }
  
  const createdCategories = [];

  console.log("📝 Creando categorías...");
  for (const catData of categoriesToCreate) {
    const categoryCreateData: Prisma.ChampionshipCategoryUncheckedCreateInput = {
      code: catData.code,
      championshipId: championship.id,
      modality: catData.modality,
      gender: catData.gender,
      ageRangeId: seniorRange.id,
      beltMinId: catData.level.beltMinId,
      beltMaxId: catData.level.beltMaxId,
      weight: null,
    };

    const category = await prisma.championshipCategory.upsert({
      where: {
        championshipId_modality_gender_ageRangeId_beltMinId_beltMaxId_weight: {
          championshipId: championship.id,
          modality: catData.modality,
          gender: catData.gender,
          ageRangeId: seniorRange.id,
          beltMinId: catData.level.beltMinId,
          beltMaxId: catData.level.beltMaxId,
          // Esto es un hack para que el upsert funcione con null en el campo weight.
          weight: "", 
        },
      },
      update: { code: catData.code },
      create: categoryCreateData,
    });
    createdCategories.push({ ...category, ...catData });
    console.log(`   ✓ ${catData.label} (${catData.code})`);
  }
  console.log(`✅ ${createdCategories.length} Categorías creadas.`);

  // =====================================================
  // NUEVO: REGISTRO DE ACADEMIAS EN EL CAMPEONATO
  // =====================================================
  console.log("🏫 Registrando Academias en el Campeonato (Status: PreInscrito)...");
  for (const academy of academies) {
    await prisma.academyOnChampionships.upsert({
      where: {
        academyId_championshipId: {
          academyId: academy.id,
          championshipId: championship.id,
        },
      },
      update: { status: "PreInscrito" },
      create: {
        academyId: academy.id,
        championshipId: championship.id,
        status: "PreInscrito",
      },
    });
  }
  console.log(`✅ ${academies.length} Academias registradas con estado 'PreInscrito'.`);


  // 2. CREAR ESTUDIANTES ALEATORIOS (si no existen)
  console.log("🎓 Creando estudiantes...");
  const studentPassword = await bcrypt.hash("123456", 10);
  const students: { student: any, beltKyu: number, isMale: boolean, academyId: number }[] = [];

  for (const academy of academies) {
    // Generar entre 20 y 30 estudiantes por academia para asegurar la cuota de categorías
    const numStudents = Math.floor(Math.random() * 11) + 20; // 20 a 30
    
    for (let i = 0; i < numStudents; i++) {
      const isMale = Math.random() > 0.5;
      const firstname = isMale 
        ? getRandomItem(maleNames)
        : getRandomItem(femaleNames);
      const lastname = getRandomItem(lastNames);
      
      // Asignar cinturón según los 3 niveles
      let beltId: number;
      let beltKyu: number;
      const levelAssignment = Math.random();
      
      if (levelAssignment < 0.3) { // 30% Básico (Kyu 10, 9, 8)
        beltId = belts.basicMin.id; // Asignamos el mínimo del rango para simplificar (10mo Kyu)
        beltKyu = 10;
      } else if (levelAssignment < 0.6) { // 30% Intermedio (Kyu 7, 6, 5, 4)
        beltId = belts.intermediateMin.id; // (7mo Kyu)
        beltKyu = 7;
      } else { // 40% Avanzado (Kyu 3, 2, 1, 0)
        beltId = belts.advancedMin.id; // (3er Kyu)
        beltKyu = 3;
      }
      
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}${totalStudentsCreated}@${isUniversityEvent ? 'uni' : 'club'}.pe`;
      
      // Fecha de nacimiento aleatoria para Senior (18-30 años)
      const birthYear = Math.floor(Math.random() * 12) + 1994; // 1994-2005 = 19-30 años en 2025
      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;
      const birthdate = new Date(birthYear, birthMonth - 1, birthDay);

      const studentUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          username: `${firstname}${lastname}${totalStudentsCreated}`,
          password: studentPassword,
          birthdate,
          status: "Activo",
          gender: isMale ? "M" : "F", // 👈 Género del usuario estudiante
          roleId: studentRole.id,
        },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          firstname,
          lastname,
          birthdate,
          gender: isMale ? "M" : "F", // 👈 Asignar género
          beltId,
          userId: studentUser.id,
          academyId: academy.id,
        },
      });
      
      students.push({ student, beltKyu, isMale, academyId: academy.id });
      totalStudentsCreated++;
    }
    console.log(`   ✓ ${academy.name}: ${numStudents} estudiantes creados.`);
  }
  console.log(`✅ ${students.length} estudiantes creados para ${name}.`);

  // 3. INSCRIPCIÓN DE PARTICIPANTES (8-14 por categoría)
  console.log("📝 Inscribiendo participantes (Status: Participar)...");
  let totalParticipants = 0;

  for (const category of createdCategories) {
    // Filtrar estudiantes elegibles por género y nivel de cinturón
    const eligibleStudents = students.filter(s => {
      const beltKyu = s.beltKyu; // Kyu de la persona (10 es blanco, 0 es negro)

      // Usar los kyu bounds correctos almacenados en la definición de nivel
      const isBeltEligible = beltKyu <= category.level.beltMinKyu && beltKyu >= category.level.beltMaxKyu;

      const isGenderEligible = (category.gender === "Masculino" && s.isMale) || (category.gender === "Femenino" && !s.isMale);

      // Limitar a estudiantes que pertenecen a una de las academias participantes
      const isFromParticipantAcademy = academies.some(a => a.id === s.academyId);

      return isBeltEligible && isGenderEligible && isFromParticipantAcademy;
    });
    
    // Obtener los IDs de los estudiantes elegibles
    const eligibleStudentIds = eligibleStudents.map(s => s.student.id);

    // Asegurar que haya entre MIN_PARTICIPANTS y MAX_PARTICIPANTS inscritos.
    // Si no hay suficientes estudiantes elegibles, crear estudiantes adicionales temporales hasta completar el mínimo.
    let numToEnroll = Math.floor(Math.random() * (MAX_PARTICIPANTS - MIN_PARTICIPANTS + 1)) + MIN_PARTICIPANTS;

    // Si hay menos elegibles que el número objetivo, intentamos crear estudiantes adicionales dentro de la misma academia pool
    if (eligibleStudentIds.length < numToEnroll) {
      const shortage = numToEnroll - eligibleStudentIds.length;
      console.log(`     ⚠️ Faltan ${shortage} participantes elegibles para la categoría ${category.code}. Creando estudiantes adicionales...`);

      for (let sIndex = 0; sIndex < shortage; sIndex++) {
        // Crear un estudiante que cumpla género y rango de cinturón
        const isMaleNeeded = category.gender === "Masculino";
        const firstname = isMaleNeeded ? getRandomItem(maleNames) : getRandomItem(femaleNames);
        const lastname = getRandomItem(lastNames);
        const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}_extra${totalStudentsCreated}@seed.auto`;

        const user = await prisma.user.create({
          data: {
            email,
            username: `${firstname}${lastname}${totalStudentsCreated}`,
            password: studentPassword,
            birthdate: new Date(2000, 0, 1),
            status: "Activo",
            gender: isMaleNeeded ? "M" : "F", // 👈 Género del usuario estudiante extra
            roleId: studentRole.id,
          },
        });

        // Asignamos el cinturón mínimo del rango para simplificar
        const beltIdForStudent = category.level.beltMinId;

        const studentRecord = await prisma.student.create({
          data: {
            firstname,
            lastname,
            birthdate: new Date(2000, 0, 1),
            gender: isMaleNeeded ? "M" : "F", // 👈 Asignar género
            beltId: beltIdForStudent,
            userId: user.id,
            // Asignar a la primera academia participante para mantener consistencia
            academyId: academies[0].id,
          },
        });

        // Añadir al pool local para poder inscribirlo
        students.push({ student: studentRecord, beltKyu: category.level.beltMinKyu, isMale: isMaleNeeded, academyId: academies[0].id });
        eligibleStudentIds.push(studentRecord.id);
        totalStudentsCreated++;
      }
    }

    // Finalmente, si hay más elegibles que el máximo, reducimos
    numToEnroll = Math.min(numToEnroll, eligibleStudentIds.length, MAX_PARTICIPANTS);
    
    // Tomar una muestra aleatoria para evitar sesgo
    const shuffledStudents = eligibleStudentIds.sort(() => 0.5 - Math.random());
    const studentsToEnroll = shuffledStudents.slice(0, numToEnroll);

    // Inscribir a los estudiantes
    for (const studentId of studentsToEnroll) {
      await prisma.participant.upsert({
        where: {
          studentId_championshipCategoryId: {
            studentId: studentId,
            championshipCategoryId: category.id,
          },
        },
        update: {
          // Si ya existe, no modificamos nada
        }, 
        create: {
          studentId: studentId,
          championshipCategoryId: category.id,
        },
      });
      totalParticipants++;
    }
    
    console.log(`   ✓ ${category.code}: ${numToEnroll} inscritos.`);
  }

  console.log(`✅ ${totalParticipants} inscripciones realizadas para ${name}.`);
  console.log(`✅ ${totalParticipants} inscripciones realizadas para ${name}.`);
  return championship;
}

// =====================================================
// EJECUCIÓN DEL SEED
// =====================================================

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });