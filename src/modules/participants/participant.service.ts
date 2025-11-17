// src/modules/participants/participant.service.ts

// 1. Importaciones de Prisma
import { Prisma, PrismaClient, Participant, ChampionshipCategory, Championship, Student } from "@/generated/prisma";
// 2. Importación del helper paginate
import { paginate } from "@/modules/common/pagination/pagination.helper";
// 3. Importación de PaginationParams y Payloads (asumiendo que están en @/types)
import {
  PaginationParams,
  CreateParticipantPayload,
  UpdateParticipantPayload // 💡 Asumiendo que este tipo ya existe en tus @/types
} from "@/types"; 

const prisma = new PrismaClient();

// Tipo interno para la consulta con includes
type ParticipantWithIncludes = Participant & {
  student: (Student & {
    belt: { name: string } | null;
    academy: { name: string } | null;
  }) | null;
  championshipCategory: (ChampionshipCategory & {
    championship: Championship | null;
    ageRange: { label: string } | null;
  }) | null;
};

// Opciones de 'include' reutilizables
const participantInclude = {
  student: {
    include: {
      belt: { select: { name: true } },
      academy: { select: { name: true } },
    },
  },
  championshipCategory: {
    include: {
      championship: true,
      ageRange: { select: { label: true } },
    },
  },
};


export class ParticipantService {
  
  /**
   * Crea múltiples inscripciones usando transacción.
   * Valida que el cinturón del estudiante esté dentro del rango permitido por cada categoría.
   */
  async create(data: CreateParticipantPayload) {
    // 💡 Implementación para manejar múltiples categoryIds
    const { studentId, categoryIds } = data;

    // 1. Obtener el estudiante con su cinturón
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { belt: true }
    });

    if (!student) {
      throw new Error('Estudiante no encontrado');
    }

    if (!student.belt) {
      throw new Error('El estudiante no tiene un cinturón asignado');
    }

    // 2. Validar cada categoría antes de crear
    const validationErrors: string[] = [];
    
    for (const categoryId of categoryIds) {
      const category = await prisma.championshipCategory.findUnique({
        where: { id: categoryId },
        include: {
          beltMin: true,
          beltMax: true,
          championship: { select: { name: true } },
          ageRange: { select: { label: true } }
        }
      });

      if (!category) {
        validationErrors.push(`Categoría con ID ${categoryId} no encontrada`);
        continue;
      }

      // Validar género
      // Mapear género del estudiante (M/F/OTRO/PREFIERO_NO_DECIR) a género de categoría (Masculino/Femenino)
      const studentGenderStr = student.gender === 'M' ? 'Masculino' : student.gender === 'F' ? 'Femenino' : null;
      
      if (!studentGenderStr) {
        const categoryDesc = `${category.modality} ${category.gender} ${category.ageRange?.label || ''} ${category.weight || ''}`.trim();
        validationErrors.push(
          `El estudiante tiene género "${student.gender}" que no puede participar en categorías Masculino/Femenino. ` +
          `Categoría: "${categoryDesc}".`
        );
        continue;
      }

      if (studentGenderStr !== category.gender) {
        const categoryDesc = `${category.modality} ${category.gender} ${category.ageRange?.label || ''} ${category.weight || ''}`.trim();
        validationErrors.push(
          `El estudiante con género ${studentGenderStr} no puede inscribirse en la categoría ${category.gender}. ` +
          `Categoría: "${categoryDesc}".`
        );
        continue;
      }

      // Validar rango de cinturones usando kyuLevel
      // kyuLevel: 10 = Blanco ... 1 = Marrón, 0 = Negro
      // Nota: A MENOR kyuLevel, MAYOR grado (Negro=0 es el más alto)
      const studentKyuLevel = student.belt.kyuLevel;
      const minKyuLevel = category.beltMin.kyuLevel;
      const maxKyuLevel = category.beltMax.kyuLevel;

      // El estudiante debe estar en el rango: maxKyuLevel <= studentKyu <= minKyuLevel
      // (porque kyuLevel es inverso: menor número = mayor rango)
      // ✅ CORREGIDO: Validación inclusiva
      if (studentKyuLevel < maxKyuLevel || studentKyuLevel > minKyuLevel) {
        const categoryDesc = `${category.modality} ${category.gender} ${category.ageRange?.label || ''} ${category.weight || ''}`.trim();
        validationErrors.push(
          `El cinturón ${student.belt.name} (nivel ${studentKyuLevel}) no está permitido en la categoría "${categoryDesc}". ` +
          `Se requiere cinturón entre ${category.beltMin.name} (nivel ${minKyuLevel}) y ${category.beltMax.name} (nivel ${maxKyuLevel}).`
        );
      }
    }

    // Si hay errores de validación, lanzar excepción con todos los mensajes
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' | '));
    }

    // 3. Si todas las validaciones pasaron, crear las inscripciones
    const creationActions = categoryIds.map(categoryId => {
      return prisma.participant.create({
        data: {
          studentId: studentId, 
          championshipCategoryId: categoryId,
        },
        include: participantInclude,
      });
    });

    const newParticipants = await prisma.$transaction(creationActions);
    return newParticipants;
  }

  /**
   * Obtiene todos los participantes (lista simple, sin paginar).
   */
  async getAll() {
    return prisma.participant.findMany({
      include: participantInclude,
    });
  }

  /**
   * Obtiene participantes paginados, con filtros.
   */
  async getPaginated(params: PaginationParams & { 
    championshipId?: number; 
    categoryId?: number; 
    studentId?: number;
    academyId?: number; // 🆕 Filtro por academia
  }) {
    
    const whereClause: Prisma.ParticipantWhereInput = {};

    if (params.studentId) {
      whereClause.studentId = params.studentId;
    }
    if (params.categoryId) {
      whereClause.championshipCategoryId = params.categoryId;
    }
    if (params.championshipId) {
      whereClause.championshipCategory = {
        championshipId: params.championshipId,
      };
    }
    // 🆕 Filtrar por academia (para entrenadores)
    if (params.academyId) {
      whereClause.student = {
        academyId: params.academyId
      };
    }

    const result = await paginate<ParticipantWithIncludes>(
      prisma.participant,
      params, // Contiene page y limit
      {
        where: whereClause,
        include: participantInclude,
        orderBy: { id: "desc" },
      }
    );

    // Mapeamos los datos (como en StudentService)
    const data = result.data.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      championshipCategoryId: p.championshipCategoryId,
      studentName: p.student ? `${p.student.firstname} ${p.student.lastname}` : "N/A",
      academyName: p.student?.academy?.name ?? "N/A",
      beltName: p.student?.belt?.name ?? "N/A",
      categoryName: p.championshipCategory 
        ? `${p.championshipCategory.modality} ${p.championshipCategory.gender} ${p.championshipCategory.ageRange?.label} ${p.championshipCategory.weight ?? ''}`.trim()
        : "N/A",
      championshipName: p.championshipCategory?.championship?.name ?? "N/A",
      student: p.student ? {
          id: p.student.id,
          firstname: p.student.firstname,
          lastname: p.student.lastname
      } : null,
      category: p.championshipCategory ? {
          id: p.championshipCategory.id,
          code: p.championshipCategory.code
      } : null
    }));

    return { data, meta: result.meta };
  }

  /**
   * Obtiene un participante por su ID.
   */
  async getById(id: number) {
    return prisma.participant.findUnique({
      where: { id },
      include: participantInclude,
    });
  }

  /**
   * 💥 NUEVO: Actualiza la categoría de una inscripción individual.
   * Valida que el cinturón del estudiante esté dentro del rango permitido por la nueva categoría.
   */
  async update(id: number, payload: UpdateParticipantPayload) {
    // 1. Obtener el participante actual con el estudiante y su cinturón
    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        student: {
          include: { belt: true }
        }
      }
    });

    if (!participant) {
      throw new Error('Inscripción no encontrada');
    }

    if (!participant.student?.belt) {
      throw new Error('El estudiante no tiene un cinturón asignado');
    }

    // 2. Obtener la nueva categoría con sus rangos de cinturones
    const newCategory = await prisma.championshipCategory.findUnique({
      where: { id: payload.championshipCategoryId },
      include: {
        beltMin: true,
        beltMax: true,
        championship: { select: { name: true } },
        ageRange: { select: { label: true } }
      }
    });

    if (!newCategory) {
      throw new Error('Categoría no encontrada');
    }

    // 3. Validar género
    const studentGenderStr = participant.student.gender === 'M' ? 'Masculino' : participant.student.gender === 'F' ? 'Femenino' : null;
    
    if (!studentGenderStr) {
      const categoryDesc = `${newCategory.modality} ${newCategory.gender} ${newCategory.ageRange?.label || ''} ${newCategory.weight || ''}`.trim();
      throw new Error(
        `El estudiante tiene género "${participant.student.gender}" que no puede participar en categorías Masculino/Femenino. ` +
        `Categoría: "${categoryDesc}".`
      );
    }

    if (studentGenderStr !== newCategory.gender) {
      const categoryDesc = `${newCategory.modality} ${newCategory.gender} ${newCategory.ageRange?.label || ''} ${newCategory.weight || ''}`.trim();
      throw new Error(
        `El estudiante con género ${studentGenderStr} no puede inscribirse en la categoría ${newCategory.gender}. ` +
        `Categoría: "${categoryDesc}".`
      );
    }

    // 4. Validar rango de cinturones
    const studentKyuLevel = participant.student.belt.kyuLevel;
    const minKyuLevel = newCategory.beltMin.kyuLevel;
    const maxKyuLevel = newCategory.beltMax.kyuLevel;

    // ✅ CORREGIDO: Validación inclusiva (maxKyuLevel <= studentKyu <= minKyuLevel)
    if (studentKyuLevel < maxKyuLevel || studentKyuLevel > minKyuLevel) {
      const categoryDesc = `${newCategory.modality} ${newCategory.gender} ${newCategory.ageRange?.label || ''} ${newCategory.weight || ''}`.trim();
      throw new Error(
        `El cinturón ${participant.student.belt.name} (nivel ${studentKyuLevel}) no está permitido en la categoría "${categoryDesc}". ` +
        `Se requiere cinturón entre ${newCategory.beltMin.name} (nivel ${minKyuLevel}) y ${newCategory.beltMax.name} (nivel ${maxKyuLevel}).`
      );
    }

    // 5. Si todas las validaciones pasaron, actualizar
    return prisma.participant.update({
      where: { id },
      data: { championshipCategoryId: payload.championshipCategoryId },
      include: participantInclude,
    });
  }

  /**
   * Elimina un participante.
   */
  async delete(id: number) {
    return prisma.participant.delete({ where: { id } });
  }
}