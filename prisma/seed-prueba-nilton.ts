// seed-prueba-nilton.ts
// Campeonato de prueba con distribución específica de academias

import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed: Campeonato Prueba Nilton...\n");

  // =====================================================
  // 1. Obtener datos base existentes
  // =====================================================
  
  const adminRole = await prisma.role.findFirstOrThrow({ where: { description: "Administrador" } });
  const coachRole = await prisma.role.findFirstOrThrow({ where: { description: "Entrenador" } });
  const studentRole = await prisma.role.findFirstOrThrow({ where: { description: "Estudiante" } });
  
  const seniorRange = await prisma.ageRange.findFirstOrThrow({ 
    where: { label: "Senior (18+ años)" } 
  });
  
  const belt3erKyu = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 3 } });
  const beltNegro = await prisma.belt.findFirstOrThrow({ where: { kyuLevel: 0 } });
  
  console.log("✅ Datos base cargados.");

  // =====================================================
  // 2. Crear 4 Academias de Prueba
  // =====================================================
  
  const coachPassword = await bcrypt.hash("123456", 10);
  const academiesData = [
    { name: "Club Regatas Lima", coach: "Edwin Asereto", email: "easereto@test.pe", numKataStudents: 2, numKumiteStudents: 4 },
    { name: "Noikon", coach: "Carlos Mendoza", email: "cmendoza@test.pe", numKataStudents: 3, numKumiteStudents: 3 },
    { name: "AKD", coach: "Mallory Aco", email: "maco@test.pe", numKataStudents: 1, numKumiteStudents: 2 },
    { name: "Kuba Peru", coach: "Luis Vargas", email: "lvargas@test.pe", numKataStudents: 2, numKumiteStudents: 0 },
    { name: "UCV", coach: "María Rojas", email: "mrojas@test.pe", numKataStudents: 0, numKumiteStudents: 3 },
  ];
  
  console.log("🏋️ Creando academias de prueba...");
  const academies = [];
  
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
        gender: "M",
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
    
    academies.push({ ...academy, ...academyData });
    console.log(`   ✓ ${academy.name} - ${academyData.coach}`);
  }
  
  console.log(`✅ ${academies.length} Academias creadas.\n`);

  // =====================================================
  // 3. Crear Campeonato
  // =====================================================
  
  console.log("🏆 Creando Campeonato Prueba Nilton...");
  const championship = await prisma.championship.upsert({
    where: { name: "Campeonato Prueba Nilton" },
    update: { 
      status: "En Curso",
    },
    create: {
      name: "Campeonato Prueba Nilton",
      startDate: new Date("2025-11-20"),
      location: "Dojo Central",
      district: "San Miguel",
      province: "Lima",
      country: "Perú",
      description: "Campeonato de prueba con distribución específica de academias.",
      status: "En Curso",
      academyId: academies[0].id,
      referees: 4,
      tatamis: 2,
    },
  });
  
  console.log(`✅ Campeonato: ${championship.name}\n`);

  // =====================================================
  // 4. Registrar Academias en el Campeonato
  // =====================================================
  
  console.log("🏫 Registrando academias en el campeonato...");
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
  console.log(`✅ ${academies.length} Academias registradas.\n`);

  // =====================================================
  // 5. Crear Categorías (Kata y Kumite Masculino Senior)
  // =====================================================
  
  console.log("📝 Creando categorías...");
  
  const categoryKata = await prisma.championshipCategory.upsert({
    where: {
      championshipId_modality_gender_ageRangeId_beltMinId_beltMaxId_weight: {
        championshipId: championship.id,
        modality: "Kata",
        gender: "Masculino",
        ageRangeId: seniorRange.id,
        beltMinId: belt3erKyu.id,
        beltMaxId: beltNegro.id,
        weight: "",
      },
    },
    update: { code: "A48" },
    create: {
      code: "A48",
      championshipId: championship.id,
      modality: "Kata",
      gender: "Masculino",
      ageRangeId: seniorRange.id,
      beltMinId: belt3erKyu.id,
      beltMaxId: beltNegro.id,
      weight: null,
    },
  });
  
  const categoryKumite = await prisma.championshipCategory.upsert({
    where: {
      championshipId_modality_gender_ageRangeId_beltMinId_beltMaxId_weight: {
        championshipId: championship.id,
        modality: "Kumite",
        gender: "Masculino",
        ageRangeId: seniorRange.id,
        beltMinId: belt3erKyu.id,
        beltMaxId: beltNegro.id,
        weight: "",
      },
    },
    update: { code: "A49" },
    create: {
      code: "A49",
      championshipId: championship.id,
      modality: "Kumite",
      gender: "Masculino",
      ageRangeId: seniorRange.id,
      beltMinId: belt3erKyu.id,
      beltMaxId: beltNegro.id,
      weight: null,
    },
  });
  
  console.log(`   ✓ Kata Masculino Senior (A48) - 3er Kyu a Negro`);
  console.log(`   ✓ Kumite Masculino Senior (A49) - 3er Kyu a Negro`);
  console.log(`✅ 2 Categorías creadas.\n`);

  // =====================================================
  // 6. Crear Estudiantes y Participantes
  // =====================================================
  
  const studentPassword = await bcrypt.hash("123456", 10);
  const maleNames = ["Juan", "Carlos", "Miguel", "Pedro", "Luis", "Javier", "Diego", "Mateo", "Andrés", "Sebastián", "Fernando", "Roberto"];
  const lastNames = ["García", "López", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz"];
  
  const beltOptions = [belt3erKyu.id, beltNegro.id]; // Alternamos entre 3er Kyu y Negro
  
  let studentCounter = 0;
  let totalKataParticipants = 0;
  let totalKumiteParticipants = 0;

  console.log("🎓 Creando estudiantes e inscribiéndolos...\n");

  for (const academy of academies) {
    console.log(`📚 Academia: ${academy.name}`);
    
    // KATA - Crear según numKataStudents (solo si > 0)
    if (academy.numKataStudents > 0) {
      console.log(`   Kata: ${academy.numKataStudents} participantes`);
      for (let i = 0; i < academy.numKataStudents; i++) {
      const firstname = maleNames[studentCounter % maleNames.length];
      const lastname = lastNames[Math.floor(studentCounter / maleNames.length) % lastNames.length];
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}${studentCounter}@prueba.pe`;
      const beltId = beltOptions[studentCounter % beltOptions.length];
      
      const studentUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          username: `${firstname}${lastname}${studentCounter}`,
          password: studentPassword,
          birthdate: new Date(1995, 0, 1),
          status: "Activo",
          gender: "M",
          roleId: studentRole.id,
        },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          firstname,
          lastname,
          birthdate: new Date(1995, 0, 1),
          gender: "M",
          beltId,
          userId: studentUser.id,
          academyId: academy.id,
        },
      });

      await prisma.participant.upsert({
        where: {
          studentId_championshipCategoryId: {
            studentId: student.id,
            championshipCategoryId: categoryKata.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          championshipCategoryId: categoryKata.id,
        },
      });
      
      totalKataParticipants++;
      studentCounter++;
      console.log(`      ✓ ${firstname} ${lastname} inscrito en Kata`);
      }
    } else {
      console.log(`   Kata: Sin participantes`);
    }
    
    // KUMITE - Crear según numKumiteStudents (solo si > 0)
    if (academy.numKumiteStudents > 0) {
      console.log(`   Kumite: ${academy.numKumiteStudents} participantes`);
      for (let i = 0; i < academy.numKumiteStudents; i++) {
      const firstname = maleNames[studentCounter % maleNames.length];
      const lastname = lastNames[Math.floor(studentCounter / maleNames.length) % lastNames.length];
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}${studentCounter}@prueba.pe`;
      const beltId = beltOptions[studentCounter % beltOptions.length];
      
      const studentUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          username: `${firstname}${lastname}${studentCounter}`,
          password: studentPassword,
          birthdate: new Date(1995, 0, 1),
          status: "Activo",
          gender: "M",
          roleId: studentRole.id,
        },
      });

      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
          firstname,
          lastname,
          birthdate: new Date(1995, 0, 1),
          gender: "M",
          beltId,
          userId: studentUser.id,
          academyId: academy.id,
        },
      });

      await prisma.participant.upsert({
        where: {
          studentId_championshipCategoryId: {
            studentId: student.id,
            championshipCategoryId: categoryKumite.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          championshipCategoryId: categoryKumite.id,
        },
      });
      
      totalKumiteParticipants++;
      studentCounter++;
      console.log(`      ✓ ${firstname} ${lastname} inscrito en Kumite`);
      }
    } else {
      console.log(`   Kumite: Sin participantes`);
    }
    
    console.log("");
  }

  // =====================================================
  // RESUMEN FINAL
  // =====================================================
  
  console.log("\n🎉 Seed completado con éxito!\n");
  console.log("════════════════════════════════════════════════");
  console.log("📋 RESUMEN - CAMPEONATO PRUEBA NILTON:");
  console.log("════════════════════════════════════════════════");
  console.log(`🏆 Campeonato: ${championship.name}`);
  console.log(`📅 Fecha: ${championship.startDate.toLocaleDateString()}`);
  console.log(`📍 Ubicación: ${championship.location}, ${championship.district}`);
  console.log(`\n📊 CATEGORÍAS:`);
  console.log(`   - Kata Masculino Senior (A48): ${totalKataParticipants} participantes (Total: 8)`);
  console.log(`   - Kumite Masculino Senior (A49): ${totalKumiteParticipants} participantes (Total: 12)`);
  console.log(`\n🏫 DISTRIBUCIÓN POR ACADEMIA:`);
  
  console.log(`\n   📋 KATA (8 participantes):`);
  for (const academy of academies) {
    if (academy.numKataStudents > 0) {
      console.log(`      - ${academy.name}: ${academy.numKataStudents} participantes`);
    }
  }
  
  console.log(`\n   🥊 KUMITE (12 participantes):`);
  for (const academy of academies) {
    if (academy.numKumiteStudents > 0) {
      console.log(`      - ${academy.name}: ${academy.numKumiteStudents} participantes`);
    }
  }
  
  console.log("\n════════════════════════════════════════════════");
  console.log("✅ Total estudiantes creados: " + studentCounter);
  console.log("════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
