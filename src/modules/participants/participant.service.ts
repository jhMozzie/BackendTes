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
   */
  async create(data: CreateParticipantPayload) {
    // 💡 Implementación para manejar múltiples categoryIds
    const { studentId, categoryIds } = data;

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
   */
  async update(id: number, payload: UpdateParticipantPayload) {
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