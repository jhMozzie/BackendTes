import { PrismaClient, Academy, Championship, Prisma } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed - Campeonato Nacional Universitario de Karate...");

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
  console.log("✅ Roles base creados.");

  // =====================================================
  // 2️⃣ Crear Cinturones (Belts)
  // =====================================================
  console.log("🥋 Creando cinturones...");
  const beltsData = [
    { name: "Blanco 10mo Kyu", kyuLevel: 10 },
    { name: "Amarillo 9no Kyu", kyuLevel: 9 },
    { name: "Naranja 8vo Kyu", kyuLevel: 8 },
    { name: "Naranja Punta Verde 7mo Kyu", kyuLevel: 7 },
    { name: "Verde 6to Kyu", kyuLevel: 6 },
    { name: "Azul 5to Kyu", kyuLevel: 5 },
    { name: "Azul Punta Marrón 4to Kyu", kyuLevel: 4 },
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
  
  const blackBelt = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 0 } });
  const brownBelt3Kyu = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 3 } });
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
      roleId: adminRole.id,
    },
  });
  console.log("✅ Administrador: admin@karate.pe / 123456");

  // =====================================================
  // 4️⃣ Crear Entrenadores y Academias
  // =====================================================
  console.log("🏋️ Creando entrenadores y academias...");
  
  const academiesData = [
    { name: "Doryoku Kenshin Karate Do", coach: "Juan Velazco", email: "jvelazco@karate.pe" },
    { name: "Club Regatas Lima", coach: "Edwin Asereto", email: "easereto@karate.pe" },
    { name: "AKD", coach: "Mallory Aco", email: "maco@karate.pe" },
    { name: "Duverli", coach: "Gabriel Serrano", email: "gserrano@karate.pe" },
    { name: "Total Training Academy", coach: "Joseph Flores", email: "jflores@karate.pe" },
    { name: "Universidad Norbert Wiener", coach: "Rolly Lopez", email: "rlopez@karate.pe" },
    { name: "Universidad Cesar Vallejo", coach: "Kelly Castillo", email: "kcastillo@karate.pe" },
  ];

  const academies: Academy[] = [];
  const coachPassword = await bcrypt.hash("123456", 10);

  for (const academyData of academiesData) {
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
    
    academies.push(academy);
    console.log(`   ✓ ${academy.name} - ${academyData.coach}`);
  }
  console.log("✅ 7 Academias creadas.");

  // =====================================================
  // 5️⃣ Crear Rangos de Edad
  // =====================================================
  console.log("👶 Creando rangos de edad...");
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
  console.log("✅ 4 Rangos de edad creados.");

  // =====================================================
  // 6️⃣ Crear Fases del Torneo
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
  console.log("✅ 6 Fases creadas (soporta hasta 32 participantes).");

  // =====================================================
  // 7️⃣ Crear Campeonato
  // =====================================================
  console.log("🏆 Creando campeonato...");
  const championshipData: Prisma.ChampionshipUncheckedCreateInput = {
    name: "Campeonato Nacional Universitario de Karate 2025",
    startDate: new Date("2025-12-01"),
    location: "Polideportivo Nacional",
    district: "San Miguel",
    province: "Lima",
    country: "Perú",
    description: "Campeonato Nacional Universitario - Modalidades Kata y Kumite",
    status: "Activo",
    academyId: academies[0].id,
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

  // =====================================================
  // 8️⃣ Crear 4 Categorías
  // =====================================================
  console.log("📝 Creando categorías...");
  
  const categoriesData = [
    { code: "KF-SEN", modality: "Kata", gender: "Femenino", label: "Kata Femenino Senior" },
    { code: "KM-SEN", modality: "Kata", gender: "Masculino", label: "Kata Masculino Senior" },
    { code: "KuM-SEN-OPEN", modality: "Kumite", gender: "Masculino", label: "Kumite Masculino Senior Open" },
    { code: "KuF-SEN-OPEN", modality: "Kumite", gender: "Femenino", label: "Kumite Femenino Senior Open" },
  ];

  for (const catData of categoriesData) {
    const categoryCreateData: Prisma.ChampionshipCategoryUncheckedCreateInput = {
      code: catData.code,
      championshipId: championship.id,
      modality: catData.modality,
      gender: catData.gender,
      ageRangeId: seniorRange.id,
      beltMinId: brownBelt3Kyu.id,
      beltMaxId: blackBelt.id,
      weight: null,
    };

    await prisma.championshipCategory.upsert({
      where: {
        championshipId_modality_gender_ageRangeId_beltMinId_beltMaxId_weight: {
          championshipId: championship.id,
          modality: catData.modality,
          gender: catData.gender,
          ageRangeId: seniorRange.id,
          beltMinId: brownBelt3Kyu.id,
          beltMaxId: blackBelt.id,
          weight: "",
        },
      },
      update: { code: catData.code },
      create: categoryCreateData,
    });
    
    console.log(`   ✓ ${catData.label}`);
  }
  console.log("✅ 4 Categorías creadas.");

  // =====================================================
  // 9️⃣ Crear Estudiantes Aleatorios
  // =====================================================
  console.log("🎓 Creando estudiantes...");
  
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

  const studentPassword = await bcrypt.hash("123456", 10);
  let totalStudents = 0;

  for (const academy of academies) {
    // Generar entre 6 y 12 estudiantes por academia
    const numStudents = Math.floor(Math.random() * 7) + 6; // 6 a 12
    
    for (let i = 0; i < numStudents; i++) {
      // 50% masculino, 50% femenino
      const isMale = Math.random() > 0.5;
      const firstname = isMale 
        ? maleNames[Math.floor(Math.random() * maleNames.length)]
        : femaleNames[Math.floor(Math.random() * femaleNames.length)];
      const lastname = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      // Email único
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}${totalStudents}@student.pe`;
      
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
          username: `${firstname}${lastname}${totalStudents}`,
          password: studentPassword,
          birthdate,
          status: "Activo",
          roleId: studentRole.id,
        },
      });

      await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          firstname,
          lastname,
          birthdate,
          beltId: blackBelt.id,
          userId: studentUser.id,
          academyId: academy.id,
        },
      });
      
      totalStudents++;
    }
    
    console.log(`   ✓ ${academy.name}: ${numStudents} estudiantes`);
  }
  console.log(`✅ ${totalStudents} estudiantes creados (cinturón negro).\n`);

  // =====================================================
  // 🔟 Inscribir Estudiantes en Categorías
  // =====================================================
  console.log("📝 Inscribiendo estudiantes en categorías...");
  
  // Obtener todas las categorías creadas
  const categories = await prisma.championshipCategory.findMany({
    where: { championshipId: championship.id },
  });

  const kataFemeninoCategory = categories.find(c => c.code === "KF-SEN");
  const kataMasculinoCategory = categories.find(c => c.code === "KM-SEN");
  const kumiteFemeninoCategory = categories.find(c => c.code === "KuF-SEN-OPEN");
  const kumiteMasculinoCategory = categories.find(c => c.code === "KuM-SEN-OPEN");

  // Obtener todos los estudiantes
  const allStudents = await prisma.student.findMany({
    include: {
      user: true,
    },
  });

  // Separar por género
  const maleStudents = allStudents.filter(s => {
    const firstname = s.firstname.toLowerCase();
    return maleNames.map(n => n.toLowerCase()).includes(firstname);
  });

  const femaleStudents = allStudents.filter(s => {
    const firstname = s.firstname.toLowerCase();
    return femaleNames.map(n => n.toLowerCase()).includes(firstname);
  });

  let totalParticipants = 0;

  // Inscribir estudiantes masculinos en Kata (60% de los hombres)
  const maleKataCount = Math.floor(maleStudents.length * 0.6);
  for (let i = 0; i < maleKataCount && i < maleStudents.length; i++) {
    await prisma.participant.upsert({
      where: {
        studentId_championshipCategoryId: {
          studentId: maleStudents[i].id,
          championshipCategoryId: kataMasculinoCategory!.id,
        },
      },
      update: {},
      create: {
        studentId: maleStudents[i].id,
        championshipCategoryId: kataMasculinoCategory!.id,
      },
    });
    totalParticipants++;
  }
  console.log(`   ✓ Kata Masculino: ${maleKataCount} participantes`);

  // Inscribir estudiantes masculinos en Kumite (70% de los hombres)
  const maleKumiteCount = Math.floor(maleStudents.length * 0.7);
  for (let i = 0; i < maleKumiteCount && i < maleStudents.length; i++) {
    await prisma.participant.upsert({
      where: {
        studentId_championshipCategoryId: {
          studentId: maleStudents[i].id,
          championshipCategoryId: kumiteMasculinoCategory!.id,
        },
      },
      update: {},
      create: {
        studentId: maleStudents[i].id,
        championshipCategoryId: kumiteMasculinoCategory!.id,
      },
    });
    totalParticipants++;
  }
  console.log(`   ✓ Kumite Masculino: ${maleKumiteCount} participantes`);

  // Inscribir estudiantes femeninos en Kata (60% de las mujeres)
  const femaleKataCount = Math.floor(femaleStudents.length * 0.6);
  for (let i = 0; i < femaleKataCount && i < femaleStudents.length; i++) {
    await prisma.participant.upsert({
      where: {
        studentId_championshipCategoryId: {
          studentId: femaleStudents[i].id,
          championshipCategoryId: kataFemeninoCategory!.id,
        },
      },
      update: {},
      create: {
        studentId: femaleStudents[i].id,
        championshipCategoryId: kataFemeninoCategory!.id,
      },
    });
    totalParticipants++;
  }
  console.log(`   ✓ Kata Femenino: ${femaleKataCount} participantes`);

  // Inscribir estudiantes femeninos en Kumite (70% de las mujeres)
  const femaleKumiteCount = Math.floor(femaleStudents.length * 0.7);
  for (let i = 0; i < femaleKumiteCount && i < femaleStudents.length; i++) {
    await prisma.participant.upsert({
      where: {
        studentId_championshipCategoryId: {
          studentId: femaleStudents[i].id,
          championshipCategoryId: kumiteFemeninoCategory!.id,
        },
      },
      update: {},
      create: {
        studentId: femaleStudents[i].id,
        championshipCategoryId: kumiteFemeninoCategory!.id,
      },
    });
    totalParticipants++;
  }
  console.log(`   ✓ Kumite Femenino: ${femaleKumiteCount} participantes`);
  console.log(`✅ ${totalParticipants} inscripciones realizadas.\n`);

  // =====================================================
  // FIN
  // =====================================================
  console.log("\n🎉 Seed completado con éxito!\n");
  console.log("════════════════════════════════════════════════");
  console.log("📋 RESUMEN:");
  console.log("════════════════════════════════════════════════");
  console.log("Administrador: admin@karate.pe / 123456");
  console.log("\nEntrenadores (todos con clave 123456):");
  for (const a of academiesData) {
    console.log(`  · ${a.email} - ${a.coach} (${a.name})`);
  }
  console.log(`\nEstudiantes: ${totalStudents} en total (todos con clave 123456)`);
  console.log("  · Cinturón: Negro");
  console.log("  · Distribuidos aleatoriamente entre las 7 academias");
  console.log("  · Género: 50% masculino, 50% femenino (aprox.)");
  console.log("  · Edad: Senior (18-30 años)");
  console.log(`\nInscripciones: ${totalParticipants} en total`);
  console.log(`  · Hombres inscritos: ${maleKataCount} en Kata, ${maleKumiteCount} en Kumite`);
  console.log(`  · Mujeres inscritas: ${femaleKataCount} en Kata, ${femaleKumiteCount} en Kumite`);
  console.log(`  · Nota: Algunos estudiantes están en ambas modalidades`);
  console.log("\nCategorías creadas:");
  console.log("  · Kata Femenino Senior (KF-SEN)");
  console.log("  · Kata Masculino Senior (KM-SEN)");
  console.log("  · Kumite Masculino Senior Open (KuM-SEN-OPEN)");
  console.log("  · Kumite Femenino Senior Open (KuF-SEN-OPEN)");
  console.log("════════════════════════════════════════════════");
  console.log("✅ Sistema listo para generar brackets\n");

}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

