// src/modules/participants/participant.service.ts

// 1. Importaciones de Prisma
import { Prisma, PrismaClient, Participant, ChampionshipCategory, Championship, Student } from "@/generated/prisma";
// 2. Importación del helper paginate
import { paginate } from "@/modules/common/pagination/pagination.helper";
// 3. Importación de PaginationParams y Payloads (asumiendo que están en @/types)
import {
  PaginationParams,
  CreateParticipantPayload,
} from "@/types"; // 👈 Importa todo desde tu archivo global de tipos

// ❌ NO se importa 'PaginatedResult'
// import { PaginatedResult } from "@/modules/common/pagination/pagination.types";

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
   * Crea una nueva inscripción de participante.
   */
  async create(data: CreateParticipantPayload) {
    return prisma.participant.create({ 
      data,
      include: participantInclude
    });
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
   * (Sigue el patrón de StudentService y ChampionshipService)
   */
  async getPaginated(params: PaginationParams & { championshipId?: number; categoryId?: number; studentId?: number }) {
    
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

    // 👇 CORRECCIÓN: Quitamos el tipado explícito 'PaginatedResult'
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
   * Elimina un participante.
   */
  async delete(id: number) {
    return prisma.participant.delete({ where: { id } });
  }
}