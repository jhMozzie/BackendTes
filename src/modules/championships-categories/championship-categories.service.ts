// src/modules/championships-categories/championship-categories.service.ts

// 1. Importaciones de Prisma (igual que en StudentService)
import { Prisma, PrismaClient, ChampionshipCategory } from "@/generated/prisma";
// 2. Importación del helper paginate (igual que en StudentService)
import { paginate } from "@/modules/common/pagination/pagination.helper"; // Asegúrate que la ruta sea correcta
// 3. Importación de PaginationParams (igual que en StudentService, asumiendo que viene de @/types globalmente)
//    Si viene de pagination.types.ts, ajusta la ruta
import { PaginationParams } from "@/types"; // O usa: import { PaginationParams } from "@/modules/common/pagination/pagination.types";
// 4. Importaciones de Payloads específicas de este módulo
import {
  CreateChampionshipCategoryPayload,
  UpdateChampionshipCategoryPayload
} from "./championship-categories.types";
// 5. Importamos PaginatedResult porque la función paginate la devuelve
import { PaginationResult } from "@/modules/common/pagination/pagination.types"; // Asegúrate que la ruta sea correcta


const prisma = new PrismaClient();

// Tipo interno para la consulta con includes (se mantiene)
type CategoryWithIncludes = ChampionshipCategory & {
  beltMin: { name: string; kyuLevel: number } | null;
  beltMax: { name: string; kyuLevel: number } | null;
  ageRange: { label: string; minAge: number } | null;
  _count: { participants: number };
};

export class ChampionshipCategoryService {

  // ... (createCategory, updateCategory, deleteCategory, getCategoryById sin cambios en importaciones) ...
  //     (Asegúrate de que `create` y `update` usen los tipos de payload importados)

  /**
   * Crea una nueva categoría para un campeonato.
   */
  async createCategory(championshipId: number, data: CreateChampionshipCategoryPayload) { // ✅ Usa CreateChampionshipCategoryPayload
    return prisma.$transaction(async (tx) => {
        // ... (validaciones) ...
        return tx.championshipCategory.create({
            data: { ...data, championshipId: championshipId },
            include: { /* ... */ }
        });
    });
  }
   /**
   * Actualiza una categoría existente.
   */
  async updateCategory(categoryId: number, data: UpdateChampionshipCategoryPayload) { // ✅ Usa UpdateChampionshipCategoryPayload
      return prisma.$transaction(async (tx) => {
          // ... (validaciones) ...
          return tx.championshipCategory.update({
              where: { id: categoryId },
              data: { ...data },
              include: { /* ... */ }
          });
      });
  }


  /**
   * Obtiene TODAS las categorías (SIN paginar) para un campeonato, formateadas.
   */
  async getAllCategoriesByChampionshipId(championshipId: number) {
    const categories = await prisma.championshipCategory.findMany({
      where: { championshipId },
      include: {
        beltMin: { select: { name: true, kyuLevel: true } },
        beltMax: { select: { name: true, kyuLevel: true } },
        ageRange: { select: { label: true } },
        _count: { select: { participants: true } }
      },
      orderBy: [ /* ... */ ]
    });

    // Mapeo directo
    return categories.map(cat => ({
      id: cat.id, code: cat.code ?? null, modality: cat.modality, gender: cat.gender,
      ageRangeLabel: cat.ageRange?.label ?? 'N/A', beltMinName: cat.beltMin?.name ?? 'N/A',
      beltMaxName: cat.beltMax?.name ?? 'N/A', participantCount: cat._count.participants,
    }));
  }

  /**
   * Obtiene categorías PAGINADAS para un campeonato, formateadas.
   * Sigue el patrón de StudentService.
   */
  // 👇 El tipo de retorno es inferido o Promise<PaginatedResult<any>>
  async getPaginatedCategories(championshipId: number, params: PaginationParams) {

    const whereClause: Prisma.ChampionshipCategoryWhereInput = {
      championshipId: championshipId,
    };

    // La llamada a paginate devuelve PaginatedResult<CategoryWithIncludes>
    const result: PaginationResult<CategoryWithIncludes> = await paginate<CategoryWithIncludes>(
      prisma.championshipCategory,
      params,
      {
        where: whereClause,
        include: {
          beltMin: { select: { name: true, kyuLevel: true } },
          beltMax: { select: { name: true, kyuLevel: true } },
          ageRange: { select: { label: true, minAge: true } },
          _count: { select: { participants: true } }
        },
        orderBy: [ /* ... */ ]
      }
    );

    // Mapeamos los resultados directamente aquí
    const data = result.data.map((cat) => ({
      id: cat.id,
      code: cat.code ?? null,
      modality: cat.modality,
      gender: cat.gender,
      ageRangeLabel: cat.ageRange?.label ?? 'N/A',
      beltMinName: cat.beltMin?.name ?? 'N/A',
      beltMaxName: cat.beltMax?.name ?? 'N/A',
      participantCount: cat._count.participants,
    }));

    // Devolvemos el objeto { data, meta } que coincide con PaginationResult
    return { data, meta: result.meta };
  }

   /**
   * Obtiene UNA categoría por su ID, incluyendo detalles.
   */
  async getCategoryById(id: number) {
      return prisma.championshipCategory.findUnique({
          where: { id },
          include: { /* ... */ }
      });
  }

   /**
   * Elimina una categoría por su ID.
   */
  async deleteCategory(categoryId: number) {
     return prisma.$transaction(async (tx) => {
        await tx.participant.deleteMany({ where: { championshipCategoryId: categoryId } });
        const deletedCategory = await tx.championshipCategory.delete({ where: { id: categoryId } });
        return deletedCategory;
     });
  }

} // Fin de la clase