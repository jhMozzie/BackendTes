import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // =====================================================
  // 1️⃣ Crear roles base
  // =====================================================
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
      console.log(`✅ Rol creado: ${role.description}`);
    }
  }

  const adminRole = await prisma.role.findFirst({
    where: { description: "Administrador" },
  });
  const coachRole = await prisma.role.findFirst({
    where: { description: "Entrenador" },
  });
  const studentRole = await prisma.role.findFirst({
    where: { description: "Estudiante" },
  });

  if (!adminRole || !coachRole || !studentRole)
    throw new Error("❌ Faltan roles base.");

  // =====================================================
  // 2️⃣ Crear Cinturones (Belts)
  // =====================================================
  const belts = [
    { name: "Blanco", kyuLevel: 11 },
    { name: "Celeste", kyuLevel: 10 },
    { name: "Amarillo", kyuLevel: 9 },
    { name: "Naranja", kyuLevel: 8 },
    { name: "Naranja punta verde", kyuLevel: 7 },
    { name: "Verde", kyuLevel: 6 },
    { name: "Verde punta azul", kyuLevel: 5 },
    { name: "Azul", kyuLevel: 4 },
    { name: "Marrón", kyuLevel: 3 },
    { name: "Marrón", kyuLevel: 2 },
    { name: "Marrón", kyuLevel: 1 },
    { name: "Negro", kyuLevel: 0 },
  ];

  for (const belt of belts) {
    // ✅ Corrección aplicada: buscar por kyuLevel (no por name)
    const existingBelt = await prisma.belt.findFirst({
      where: { kyuLevel: belt.kyuLevel },
    });
    if (!existingBelt) {
      await prisma.belt.create({ data: belt });
      console.log(`🥋 Cinturón creado: ${belt.name} (${belt.kyuLevel}° Kyu)`);
    }
  }

  const allBelts = await prisma.belt.findMany();
  if (!allBelts.length) throw new Error("❌ No se pudieron crear cinturones.");

  // =====================================================
  // 3️⃣ Usuario Administrador principal
  // =====================================================
  const adminEmail = "admin@academy.com";
  const adminPasswordPlain = "123456";
  const adminPasswordHash = await bcrypt.hash(adminPasswordPlain, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        username: "adminPrincipal",
        password: adminPasswordHash,
        phone: "+51 900 111 222",
        birthdate: new Date("1990-01-01"),
        status: "Activo",
        roleId: adminRole.id,
      },
    });
    console.log("👑 Usuario Administrador creado:");
    console.log(`   Email: ${adminEmail}`);
  }

  // =====================================================
  // 4️⃣ Crear 5 Coaches (dojo1 ... dojo5)
  // =====================================================
  const coachPasswordPlain = "123456";
  const coachPhones = [
    "+51 901 222 333",
    "+51 902 333 444",
    "+51 903 444 555",
    "+51 904 555 666",
    "+51 905 666 777",
  ];

  const academies: any[] = [];

  for (let i = 1; i <= 5; i++) {
    const email = `dojo${i}@academy.com`;
    const username = `dojo${i}`;
    const phone = coachPhones[i - 1];

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      console.log(`⚠️ Coach ya existente: ${username}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(coachPasswordPlain, 10);

    const coachUser = await prisma.user.create({
      data: {
        email,
        username,
        password: passwordHash,
        phone,
        birthdate: new Date(`198${i}-0${i}-15`), // fecha simbólica
        status: "Activo",
        roleId: coachRole.id,
      },
    });

    const academy = await prisma.academy.create({
      data: {
        name: `Academia Dojo ${i}`,
        userId: coachUser.id,
      },
    });

    academies.push(academy);
    console.log(`🏋️ Entrenador creado: ${username} (${email})`);
  }

  // =====================================================
  // 5️⃣ Crear 12 Estudiantes (3 por cada academia)
  // =====================================================
  const studentPasswordPlain = "123456";
  const studentNames = [
    ["Carlos", "Ramírez"],
    ["Lucía", "Gonzales"],
    ["Andrés", "Salazar"],
    ["María", "Fernández"],
    ["José", "Torres"],
    ["Camila", "López"],
    ["Santiago", "Huamán"],
    ["Valeria", "Quispe"],
    ["Renato", "Cruz"],
    ["Fiorella", "Campos"],
    ["Matías", "Arias"],
    ["Diana", "Mendoza"],
  ];

  let studentIndex = 0;

  for (const academy of academies) {
    for (let j = 0; j < 3; j++) {
      if (studentIndex >= studentNames.length) break;

      const [firstname, lastname] = studentNames[studentIndex];
      const email = `${firstname.toLowerCase()}.${lastname.toLowerCase()}@gmail.com`;

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        console.log(`⚠️ Estudiante ya existente: ${firstname} ${lastname}`);
        studentIndex++;
        continue;
      }

      const passwordHash = await bcrypt.hash(studentPasswordPlain, 10);
      const birthYear = Math.random() > 0.5 ? 2008 : 2009;
      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;
      const birthdate = new Date(birthYear, birthMonth - 1, birthDay);

      // Crear usuario
      const studentUser = await prisma.user.create({
        data: {
          email,
          username: `${firstname}${lastname}`,
          password: passwordHash,
          phone: `+51 9${900000000 + studentIndex}`,
          birthdate,
          status: "Activo",
          roleId: studentRole.id,
        },
      });

      // Asignar cinturón aleatorio
      const randomBelt = allBelts[Math.floor(Math.random() * allBelts.length)];

      // Crear registro de estudiante
      await prisma.student.create({
        data: {
          firstname,
          lastname,
          birthdate,
          beltId: randomBelt.id,
          userId: studentUser.id,
          academyId: academy.id,
        },
      });

      console.log(
        `🎓 Estudiante creado: ${firstname} ${lastname} (${email}) → Edad aprox: ${
          2025 - birthYear
        }, Cinturón: ${randomBelt.name}`
      );
      studentIndex++;
    }
  }

  console.log("🎉 Seed completado con éxito!");

    // =====================================================
  // 6️⃣ Crear Campeonatos (Championships)
  // =====================================================
  console.log("🏆 Creando campeonatos...");

  const championshipsData = [
    {
      name: "Campeonato Nacional Universitario 2025",
      startDate: new Date("2025-03-15"),
      location: "Estadio Nacional",
      district: "Jesús María",
      province: "Lima",
      country: "Perú",
      image: "",
      status: "Activo",
      academyId: academies[0].id,
    },
    {
      name: "Copa Metropolitana de Karate",
      startDate: new Date("2025-04-10"),
      location: "Coliseo Eduardo Dibós",
      district: "San Borja",
      province: "Lima",
      country: "Perú",
      image: "",
      status: "Próximo",
      academyId: academies[1].id,
    },
    {
      name: "Torneo Juvenil Primavera 2025",
      startDate: new Date("2025-05-05"),
      location: "Polideportivo de Miraflores",
      district: "Miraflores",
      province: "Lima",
      country: "Perú",
      image: "",
      status: "Inscripción Abierta",
      academyId: academies[2].id,
    },
    {
      name: "Copa San Luis de Karate",
      startDate: new Date("2025-06-20"),
      location: "Complejo Deportivo San Luis",
      district: "San Luis",
      province: "Lima",
      country: "Perú",
      image: "",
      status: "Planificación",
      academyId: academies[3].id,
    },
    {
      name: "Campeonato Internacional de Lima 2025",
      startDate: new Date("2025-07-15"),
      location: "Villa Deportiva Nacional (VIDENA)",
      district: "San Luis",
      province: "Lima",
      country: "Perú",
      image: "",
      status: "Planificación",
      academyId: academies[4].id,
    },
  ];

  for (const champ of championshipsData) {
    const existing = await prisma.championship.findFirst({
      where: { name: champ.name },
    });

    if (!existing) {
      await prisma.championship.create({ data: champ });
      console.log(`✅ Campeonato creado: ${champ.name}`);
    } else {
      console.log(`⚠️ Campeonato ya existente: ${champ.name}`);
    }
  }

  console.log("🎯 Campeonatos cargados correctamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });