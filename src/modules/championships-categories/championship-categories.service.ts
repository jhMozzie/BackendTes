import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipCategoryPayload } from "./championship-categories.types";

const prisma = new PrismaClient();

export class ChampionshipCategoryService {

  

  async addCategoryToChampionship(championshipId: number, data: CreateChampionshipCategoryPayload) {
    // We use a transaction to ensure the validation and creation are an atomic operation,
    // which prevents race conditions.
    return prisma.$transaction(async (tx) => {
      // 1. Extract the user-provided code from the data payload.
      const { code, ...categoryData } = data;

      // 2. Check if a category with this code already exists IN THIS championship.
      const existingCategory = await tx.championshipCategory.findFirst({
        where: {
          championshipId: championshipId,
          code: code,
        },
      });

      // 3. If it already exists, throw a clear error.
      if (existingCategory) {
        throw new Error(`The code '${code}' is already in use for this championship.`);
      }

      // 4. If it doesn't exist, create the new record using the user-provided code.
      return tx.championshipCategory.create({
        data: {
          ...categoryData,
          code: code, // Use the code from the payload
          championship: {
            connect: {
              id: championshipId,
            },
          },
        },
      });
    });
  }

  async removeCategoryFromChampionship(categoryId: number) {
    return prisma.championshipCategory.delete({
      where: { id: categoryId }
    });
  }

   /**
   * Obtiene todas las categorías para un campeonato específico.
   * @param championshipId El ID del campeonato.
   */
   async getCategoriesByChampionshipId(championshipId: number) {
    return prisma.championshipCategory.findMany({
      where: {
        championshipId: championshipId,
      },
      // Opcional: Incluye los participantes de cada categoría si lo necesitas
      include: {
        participants: true,
      }
    });
  }
}