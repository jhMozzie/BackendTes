// SEED MAESTRO CONSOLIDADO - ORDEN CORRECTO
// 1. Roles → 2. Admin/Academias → 3. Belts → 4. Students (desde inscriptions) → 5. Age Ranges → 6. Phases → 7. Championship → 8. Categories + Inscripciones

import { PrismaClient, Gender } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Leer JSON files directamente con require
const inscriptionsDataFromJSON = require('./seed_inscriptions.json');
const categoriesDataFromJSON = require('./seed_categories.json');

// Tipos para los JSON
type AcademyJSON = { name: string };
type InscriptionRecord = {
    NOMBRE: string;
    APELLIDOS: string;
    CELULAR: string;
    "FECHA DE NACIMIENTO": string;
    GENERO: string;
    NIVEL: string; // INTERMEDIO o AVANZADO
    CATEGORIA: string;
    "ACADEMY NAME": string;
};
type InscriptionsFileJSON = {
    total_inscripciones_consolidadas: number;
    inscripciones: InscriptionRecord[];
};
type CategoryData = {
    code: string;
    modality: string;
    gender: string;
    ageMin: number;
    ageMax: number;
    beltMinKyu: number;
    beltMaxKyu: number;
    weight: string | null;
};

// =====================================================
// CONSTANTES
// =====================================================
const UNIVERSAL_PASSWORD = "123456";
const ADMIN_EMAIL = "admin@karate.pe";
const COACH_EMAIL_SUFFIX = "@academia.pe";

// =====================================================
// DATOS ESTRUCTURALES
// =====================================================

const ROLES_DATA = [
    { description: "Administrador" },
    { description: "Entrenador" },
    { description: "Estudiante" },
];

const BELTS_DATA = [
    { name: "Sin Grado (No Kyu)", kyuLevel: 11 },
    { name: "Blanco 10mo Kyu", kyuLevel: 10 },
    { name: "Amarillo 9no Kyu", kyuLevel: 9 },
    { name: "Naranja 8vo Kyu", kyuLevel: 8 },
    { name: "Naranja Punta Verde 7mo Kyu", kyuLevel: 7 },
    { name: "Verde 6to Kyu", kyuLevel: 6 }, // ← INTERMEDIO
    { name: "Azul 5to Kyu", kyuLevel: 5 },
    { name: "Azul Punta Marrón 4to Kyu", kyuLevel: 4 },
    { name: "Marrón 3er Kyu", kyuLevel: 3 },
    { name: "Marrón 2do Kyu", kyuLevel: 2 },
    { name: "Marrón 1er Kyu", kyuLevel: 1 },
    { name: "Negro", kyuLevel: 0 }, // ← AVANZADO
];

const AGE_RANGES_DATA = [
    { label: "6-7 años", minAge: 6, maxAge: 7 },
    { label: "8-9 años", minAge: 8, maxAge: 9 },
    { label: "10-11 años", minAge: 10, maxAge: 11 },
    { label: "12-13 años", minAge: 12, maxAge: 13 },
    { label: "14-15 años", minAge: 14, maxAge: 15 },
    { label: "16-17 años", minAge: 16, maxAge: 17 },
    { label: "18-34 años", minAge: 18, maxAge: 34 },
    { label: "35+ años", minAge: 35, maxAge: 99 },
    { label: "6-9 años", minAge: 6, maxAge: 9 },
    { label: "10-13 años", minAge: 10, maxAge: 13 },
    { label: "14-17 años", minAge: 14, maxAge: 17 },
    { label: "18-50 años", minAge: 18, maxAge: 50 },
    { label: "16-35 años", minAge: 16, maxAge: 35 },
    { label: "13-15 años", minAge: 13, maxAge: 15 },
    { label: "6-8 años", minAge: 6, maxAge: 8 },
    { label: "9-11 años", minAge: 9, maxAge: 11 },
    { label: "12-14 años", minAge: 12, maxAge: 14 },
    { label: "15-17 años", minAge: 15, maxAge: 17 },
];

const PHASES_DATA = [
    { description: "Dieciseisavos de Final", order: 1 },
    { description: "Octavos de Final", order: 2 },
    { description: "Cuartos de Final", order: 3 },
    { description: "Semifinal", order: 4 },
    { description: "Final (Oro)", order: 5 },
    { description: "Combate por el Bronce", order: 6 },
];

async function main() {
    console.log("\n╔════════════════════════════════════════════════╗");
    console.log("║   🌱 SEED MAESTRO CONSOLIDADO - ORDEN CORRECTO ║");
    console.log("╚════════════════════════════════════════════════╝\n");

    const passwordHash = await bcrypt.hash(UNIVERSAL_PASSWORD, 10);
    
    // Cargar archivo de inscripciones una sola vez
    const inscriptionsFile = inscriptionsDataFromJSON as InscriptionsFileJSON;
    const inscriptions = inscriptionsFile.inscripciones;

    // =====================================================
    // 1️⃣ ROLES
    // =====================================================
    console.log("1️⃣  Creando Roles...");
    for (const role of ROLES_DATA) {
        await prisma.role.upsert({
            where: { description: role.description },
            update: {},
            create: role,
        });
    }
    const adminRole = await prisma.role.findFirstOrThrow({ where: { description: "Administrador" } });
    const coachRole = await prisma.role.findFirstOrThrow({ where: { description: "Entrenador" } });
    console.log("   ✅ 3 Roles creados\n");

    // =====================================================
    // 2️⃣ ADMIN Y ACADEMIAS (extraídas de seed_inscriptions.json)
    // =====================================================
    console.log("2️⃣  Creando Admin y Academias...");
    
    // Admin
    const adminUser = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { password: passwordHash },
        create: {
            email: ADMIN_EMAIL,
            username: "admin",
            password: passwordHash,
            phone: "+51 999 999 999",
            birthdate: new Date("1990-01-01"),
            status: "Activo",
            gender: "M",
            roleId: adminRole.id,
        },
    });
    console.log(`   👤 Admin: ${adminUser.email}`);

    // Extraer academias únicas desde inscriptions
    const uniqueAcademies = new Set<string>();
    for (const record of inscriptions) {
        uniqueAcademies.add(record["ACADEMY NAME"].trim());
    }

    // Crear Coaches y Academias
    const academyMap = new Map<string, number>();
    let academyCount = 0;
    
    for (const academyName of uniqueAcademies) {
        const emailPrefix = academyName.toLowerCase().replace(/\s/g, '_').replace(/\./g, '').replace(/[^\w]/g, '');
        const email = `coach_${emailPrefix}${COACH_EMAIL_SUFFIX}`;
        
        const coachUser = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                username: emailPrefix.substring(0, 50),
                password: passwordHash,
                phone: "+51 900 000 000",
                birthdate: new Date("1985-01-01"),
                status: "Activo",
                gender: "M",
                roleId: coachRole.id,
            },
        });

        const academy = await prisma.academy.upsert({
            where: { name: academyName },
            update: { userId: coachUser.id },
            create: { name: academyName, userId: coachUser.id },
        });
        
        academyMap.set(academyName, academy.id);
        academyCount++;
    }
    console.log(`   ✅ ${academyCount} Academias y Coaches creados\n`);

    // =====================================================
    // 3️⃣ BELTS (CINTURONES)
    // =====================================================
    console.log("3️⃣  Creando Cinturones...");
    for (const belt of BELTS_DATA) {
        await prisma.belt.upsert({
            where: { name: belt.name },
            update: { kyuLevel: belt.kyuLevel },
            create: belt,
        });
    }
    const allBelts = await prisma.belt.findMany();
    const beltMap = new Map(allBelts.map(b => [b.name, b.id]));
    const beltKyuToIdMap = new Map(allBelts.map(b => [b.kyuLevel, b.id]));
    console.log(`   ✅ ${allBelts.length} Cinturones creados\n`);

    // =====================================================
    // 4️⃣ STUDENTS (DESDE seed_inscriptions.json)
    // =====================================================
    console.log("4️⃣  Creando Estudiantes desde seed_inscriptions.json...");
    
    // Limpiar datos anteriores
    await prisma.participant.deleteMany({});
    await prisma.student.deleteMany({});
    
    console.log(`   📋 Total inscripciones a procesar: ${inscriptions.length}`);

    // Función de normalización
    const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

    // Mapeo NIVEL → Belt Kyu (normalizar la búsqueda)
    const LEVEL_TO_BELT_MAP: Record<string, number> = {
        'intermedio': 6,  // Verde 6to Kyu
        'avanzado': 0,    // Negro
    };

    const academyAliases: Record<string, string> = {
        'universidad autonoma del peru': 'Universidad Autonoma del Peru',
        'universidad de lima': 'Universidad de Lima',
        'universidad cesar vallejo': 'Universidad César Vallejo',
        'universidad nacional federico villareal': 'Universidad Nacional Federico Villareal',
    };

    // Crear Map de estudiantes únicos (evitar duplicados)
    const studentMap = new Map<string, number>(); // key: "NOMBRE APELLIDOS", value: studentId
    let totalStudentsCreated = 0;
    let skippedStudents = 0;
    const skippedReasons: Record<string, number> = {};

    for (const record of inscriptions) {
        const studentKey = `${normalize(record.NOMBRE)} ${normalize(record.APELLIDOS)}`;
        
        // Si el estudiante ya fue creado, saltamos
        if (studentMap.has(studentKey)) {
            continue;
        }

        // Obtener Belt según NIVEL (normalizado)
        const normalizedNivel = normalize(record.NIVEL);
        const kyuLevel = LEVEL_TO_BELT_MAP[normalizedNivel];
        if (kyuLevel === undefined) {
            skippedStudents++;
            const reason = `Nivel desconocido: ${record.NIVEL}`;
            skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
            continue;
        }

        const beltId = beltKyuToIdMap.get(kyuLevel);
        if (!beltId) {
            skippedStudents++;
            const reason = `Belt no encontrado para Kyu ${kyuLevel}`;
            skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
            continue;
        }

        // Obtener Academia
        const rawAcademyNorm = normalize(record["ACADEMY NAME"]);
        const mappedAcademyName = academyAliases[rawAcademyNorm] || record["ACADEMY NAME"].trim();
        const academyId = academyMap.get(mappedAcademyName);

        if (!academyId) {
            skippedStudents++;
            const reason = `Academia no encontrada: ${record["ACADEMY NAME"]}`;
            skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
            continue;
        }

        // Parsear género (normalizado)
        const normalizedGender = normalize(record.GENERO);
        const genderMap: Record<string, Gender> = {
            'masculino': 'M',
            'femenino': 'F',
            'm': 'M',
            'f': 'F',
        };
        const gender = genderMap[normalizedGender];
        if (!gender) {
            skippedStudents++;
            const reason = `Género inválido: ${record.GENERO}`;
            skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
            continue;
        }

        const birthDate = new Date(record["FECHA DE NACIMIENTO"]);

        // Crear estudiante
        const student = await prisma.student.create({
            data: {
                firstname: record.NOMBRE,
                lastname: record.APELLIDOS,
                birthdate: birthDate,
                gender: gender,
                beltId: beltId,
                academyId: academyId,
            },
        });
        
        studentMap.set(studentKey, student.id);
        totalStudentsCreated++;
    }

    console.log(`   ✅ Estudiantes únicos creados: ${totalStudentsCreated}`);
    if (skippedStudents > 0) {
        console.log(`   ⚠️  Registros omitidos: ${skippedStudents}`);
        Object.entries(skippedReasons).forEach(([reason, count]) => {
            console.log(`      - ${reason}: ${count}`);
        });
    }
    console.log();

    // =====================================================
    // 5️⃣ AGE RANGES (RANGOS DE EDAD)
    // =====================================================
    console.log("5️⃣  Creando Rangos de Edad...");
    for (const range of AGE_RANGES_DATA) {
        await prisma.ageRange.upsert({
            where: { label: range.label },
            update: { minAge: range.minAge, maxAge: range.maxAge },
            create: range,
        });
    }
    const allAgeRanges = await prisma.ageRange.findMany();
    console.log(`   ✅ ${allAgeRanges.length} Rangos de Edad creados\n`);

    // =====================================================
    // 6️⃣ PHASES (FASES DEL TORNEO)
    // =====================================================
    console.log("6️⃣  Creando Fases del Torneo...");
    for (const phase of PHASES_DATA) {
        await prisma.phase.upsert({
            where: { order: phase.order },
            update: { description: phase.description },
            create: phase,
        });
    }
    console.log(`   ✅ 6 Fases creadas\n`);

    // =====================================================
    // 7️⃣ CHAMPIONSHIP (CAMPEONATO)
    // =====================================================
    console.log("7️⃣  Creando Campeonato...");
    const organizingAcademyId = academyMap.values().next().value;
    if (!organizingAcademyId) throw new Error("No hay academias disponibles");

    const championship = await prisma.championship.upsert({
        where: { name: "Campeonato Importación Masiva" },
        update: { status: "Planificación" },
        create: {
            name: "Campeonato Importación Masiva",
            startDate: new Date("2025-11-20"),
            location: "Coliseo Central",
            district: "Lima",
            country: "Perú",
            status: "Planificación",
            academyId: organizingAcademyId,
        },
    });
    console.log(`   ✅ Campeonato: ${championship.name}\n`);

    // =====================================================
    // 8️⃣ CATEGORIES E INSCRIPCIONES
    // =====================================================
    console.log("8️⃣  Creando Categorías e Inscripciones...");
    let categoryCount = 0;
    let totalParticipants = 0;
    let skippedInscriptions = 0;

    // Crear categorías desde seed_categories.json
    for (const catData of categoriesDataFromJSON as CategoryData[]) {
        const beltMinId = beltKyuToIdMap.get(catData.beltMinKyu);
        const beltMaxId = beltKyuToIdMap.get(catData.beltMaxKyu);
        const ageRange = allAgeRanges.find(r => r.minAge === catData.ageMin && r.maxAge === catData.ageMax);

        if (!beltMinId || !beltMaxId) {
            console.warn(`   ⚠️ Saltando ${catData.code}: Belts no encontrados`);
            continue;
        }

        if (!ageRange) {
            const newRange = await prisma.ageRange.create({
                data: {
                    label: `${catData.ageMin}-${catData.ageMax} años`,
                    minAge: catData.ageMin,
                    maxAge: catData.ageMax,
                },
            });
            allAgeRanges.push(newRange);
        }

        const finalAgeRange = allAgeRanges.find(r => r.minAge === catData.ageMin && r.maxAge === catData.ageMax);
        if (!finalAgeRange) continue;

        // Buscar por código único en el campeonato
        const existing = await prisma.championshipCategory.findFirst({
            where: {
                championshipId: championship.id,
                code: catData.code,
            },
        });

        let category;
        if (existing) {
            category = await prisma.championshipCategory.update({
                where: { id: existing.id },
                data: {
                    modality: catData.modality,
                    gender: catData.gender,
                    weight: catData.weight ?? null,
                    ageRangeId: finalAgeRange.id,
                    beltMinId,
                    beltMaxId,
                },
            });
        } else {
            category = await prisma.championshipCategory.create({
                data: {
                    code: catData.code,
                    modality: catData.modality,
                    gender: catData.gender,
                    weight: catData.weight ?? null,
                    championshipId: championship.id,
                    ageRangeId: finalAgeRange.id,
                    beltMinId,
                    beltMaxId,
                },
            });
        }
        categoryCount++;
    }
    console.log(`   ✅ ${categoryCount} Categorías creadas`);

    // Ahora inscribir TODAS las 105 inscripciones desde seed_inscriptions.json
    console.log(`   📝 Procesando ${inscriptions.length} inscripciones...`);
    
    // Crear mapas de búsqueda rápida
    const studentMapByName = new Map<string, number>();
    const allStudents = await prisma.student.findMany();
    
    for (const student of allStudents) {
        const key = `${normalize(student.firstname)} ${normalize(student.lastname)}`;
        studentMapByName.set(key, student.id);
    }

    const allCategories = await prisma.championshipCategory.findMany({
        where: { championshipId: championship.id },
    });
    
    // Crear map con códigos normalizados (sin espacios)
    const categoryByCode = new Map<string, number>();
    for (const cat of allCategories) {
        if (cat.code) {
            const normalizedCode = cat.code.trim();
            categoryByCode.set(normalizedCode, cat.id);
        }
    }

    // Inscribir cada registro (105 inscripciones)
    for (const record of inscriptions) {
        const studentKey = `${normalize(record.NOMBRE)} ${normalize(record.APELLIDOS)}`;
        const studentId = studentMapByName.get(studentKey);
        
        // Normalizar código de categoría (quitar espacios)
        const normalizedCategoryCode = record.CATEGORIA.trim();
        const categoryId = categoryByCode.get(normalizedCategoryCode);

        if (!studentId) {
            skippedInscriptions++;
            console.warn(`   ⚠️ Estudiante no encontrado: ${record.NOMBRE} ${record.APELLIDOS}`);
            continue;
        }

        if (!categoryId) {
            skippedInscriptions++;
            console.warn(`   ⚠️ Categoría no encontrada: "${record.CATEGORIA}" (normalizado: "${normalizedCategoryCode}")`);
            continue;
        }

        // Crear inscripción (permitiendo duplicados de estudiante en diferentes categorías)
        await prisma.participant.create({
            data: {
                studentId: studentId,
                championshipCategoryId: categoryId,
            },
        });
        totalParticipants++;
    }
    
    console.log(`   ✅ ${totalParticipants} Inscripciones creadas`);
    if (skippedInscriptions > 0) {
        console.log(`   ⚠️  ${skippedInscriptions} inscripciones omitidas\n`);
    } else {
        console.log();
    }

    // =====================================================
    // FIN
    // =====================================================
    console.log("╔════════════════════════════════════════════════╗");
    console.log("║          🎉 SEED MAESTRO COMPLETADO 🎉         ║");
    console.log("╚════════════════════════════════════════════════╝");
    console.log(`\n🔑 Password universal: ${UNIVERSAL_PASSWORD}`);
    console.log(`📧 Admin: ${adminUser.email}`);
    console.log(`📧 Coaches: coach_[academia]${COACH_EMAIL_SUFFIX}\n`);
}

main()
    .catch((e) => {
        console.error("❌ Error ejecutando SEED MAESTRO:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
