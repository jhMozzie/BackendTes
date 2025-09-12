import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipCategoryPayload } from "./championship-categories.types";

const prisma = new PrismaClient();

export class ChampionshipCategoryService {

  /**
   * Obtiene todas las categorías para un campeonato específico.
   * @param championshipId El ID del campeonato.
   */
  async getCategoriesByChampionshipId(championshipId: number) {
    return prisma.championshipCategory.findMany({
      where: {
        championshipId: championshipId,
      },
      include: {
        participants: true,
      }
    });
  }

  /**
   * Crea una nueva categoría para un campeonato.
   * @param championshipId El ID del campeonato.
   * @param data Los datos de la nueva categoría.
   */
  async createCategory(championshipId: number, data: CreateChampionshipCategoryPayload) {
    return prisma.$transaction(async (tx) => {
      const { code, ...categoryData } = data;

      // Valida si el código ya está en uso en este campeonato
      if (code) {
        const existingCategory = await tx.championshipCategory.findFirst({
          where: { championshipId, code },
        });
        if (existingCategory) {
          throw new Error(`El código '${code}' ya está en uso para este campeonato.`);
        }
      }

      // Crea el nuevo registro
      return tx.championshipCategory.create({
        data: {
          ...categoryData,
          code: code,
          championship: {
            connect: { id: championshipId },
          },
        },
      });
    });
  }

  /**
   * MÉTODO NUEVO: Actualiza una categoría existente.
   * @param categoryId El ID de la categoría a actualizar.
   * @param data Los nuevos datos para la categoría.
   */
  async updateCategory(categoryId: number, data: Partial<CreateChampionshipCategoryPayload>) {
    return prisma.$transaction(async (tx) => {
      const { code, ...categoryData } = data;

      // Valida si el nuevo código ya está en uso por OTRA categoría en el mismo campeonato
      if (code) {
        const categoryToUpdate = await tx.championshipCategory.findUnique({ where: { id: categoryId } });
        if (!categoryToUpdate) {
          throw new Error('Categoría no encontrada.');
        }

        const existingCategory = await tx.championshipCategory.findFirst({
          where: {
            championshipId: categoryToUpdate.championshipId,
            code: code,
            id: { not: categoryId }, // Excluye la categoría actual de la búsqueda
          },
        });

        if (existingCategory) {
          throw new Error(`El código '${code}' ya está en uso por otra categoría en este campeonato.`);
        }
      }

      // Actualiza el registro
      return tx.championshipCategory.update({
        where: { id: categoryId },
        data: {
          ...categoryData,
          code: code,
        },
      });
    });
  }


  /**
   * Elimina una categoría por su ID.
   * @param categoryId El ID de la categoría a eliminar.
   */
  async deleteCategory(categoryId: number) {
    return prisma.championshipCategory.delete({
      where: { id: categoryId }
    });
  }
}
