import { PrismaClient } from "@/generated/prisma";
import { AddCategoryToChampionshipPayload } from './categoryOnChampionship.types';

const prisma = new PrismaClient();

export class CategoriesOnChampionshipsService {
  async addCategory(data: AddCategoryToChampionshipPayload) {
    return prisma.categoriesOnChampionships.create({
      data: {
        championship: { connect: { id: data.championshipId } },
        category: { connect: { id: data.categoryId } },
      },
    });
  }

  async removeCategory(championshipId: number, categoryId: number) {
    return prisma.categoriesOnChampionships.delete({
      where: {
        championshipId_categoryId: {
          championshipId,
          categoryId,
        },
      },
    });
  }
}