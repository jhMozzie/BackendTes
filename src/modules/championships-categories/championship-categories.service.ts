// 1. Importaciones (corregidas)
import { Prisma, PrismaClient, ChampionshipCategory } from "@/generated/prisma";
import { paginate } from "@/modules/common/pagination/pagination.helper";
import { PaginationParams } from "@/types"; // Asumiendo que esta es tu ruta correcta
import {
  CreateChampionshipCategoryPayload,
  UpdateChampionshipCategoryPayload
} from "./championship-categories.types";
import { PaginationResult } from "@/modules/common/pagination/pagination.types";


const prisma = new PrismaClient();

// Tipo interno para la consulta con includes
type CategoryWithIncludes = ChampionshipCategory & {
  beltMin: { name: string; kyuLevel: number } | null;
  beltMax: { name: string; kyuLevel: number } | null;
  ageRange: { label: string; minAge: number } | null;
  _count: { participants: number };
};

export class ChampionshipCategoryService {

  /**
   * Crea una nueva categoría para un campeonato.
   */
  async createCategory(championshipId: number, data: CreateChampionshipCategoryPayload) {
    return prisma.$transaction(async (tx) => {
      
      // Validar código si existe
      if (data.code) {
        const existingCode = await tx.championshipCategory.findFirst({
          where: { championshipId, code: data.code },
        });
        if (existingCode) {
          throw new Error(`El código '${data.code}' ya está en uso para este campeonato.`);
        }
      }

      // 👇 CORRECCIÓN: Aseguramos que 'weight' sea 'null' si no viene (para Kata)
      const weight = data.weight ?? null;

      // 👇 CORRECCIÓN: Esta es la validación que te faltaba y que previene el error
      const existingUnique = await tx.championshipCategory.findFirst({
        where: {
          championshipId: championshipId,
          modality: data.modality,
          gender: data.gender,
          ageRangeId: data.ageRangeId,
          beltMinId: data.beltMinId,
          beltMaxId: data.beltMaxId,
          weight: weight, // Usamos la variable 'weight' (que puede ser null)
        }
      });
      
      // Si ya existe, lanza un error amigable
      if (existingUnique) {
        throw new Error('Ya existe una categoría con esta combinación de modalidad, género, edad y cinturones.');
      }
      // ----- Fin de la validación -----

      // Si no existe, la crea
      return tx.championshipCategory.create({
          data: { 
            ...data, 
            weight: weight, // Pasamos el 'weight' procesado
            championshipId: championshipId 
          },
          include: { // Rellenamos el include
            beltMin: { select: { name: true } },
            beltMax: { select: { name: true } },
            ageRange: { select: { label: true } },
          }
      });
    });
  }

  /**
   * Actualiza una categoría existente.
   */
  async updateCategory(categoryId: number, data: UpdateChampionshipCategoryPayload) {
      return prisma.$transaction(async (tx) => {
          // Validar código si se intenta cambiar
          if (data.code !== undefined) {
            const categoryToUpdate = await tx.championshipCategory.findUniqueOrThrow({
                where: { id: categoryId }, select: { championshipId: true }
            });
            const existingCode = await tx.championshipCategory.findFirst({
              where: { championshipId: categoryToUpdate.championshipId, code: data.code, id: { not: categoryId } },
            });
            if (existingCode) throw new Error(`El código '${data.code}' ya está en uso.`);
          }

          // Validar combinación única si se intentan cambiar campos clave
          if (data.modality || data.gender || data.ageRangeId || data.beltMinId || data.beltMaxId || data.weight !== undefined) {
              const currentCategory = await tx.championshipCategory.findUniqueOrThrow({ where: { id: categoryId } });
              const potentialDuplicate = await tx.championshipCategory.findFirst({
                  where: {
                      championshipId: currentCategory.championshipId,
                      modality: data.modality ?? currentCategory.modality,
                      gender: data.gender ?? currentCategory.gender,
                      ageRangeId: data.ageRangeId ?? currentCategory.ageRangeId,
                      beltMinId: data.beltMinId ?? currentCategory.beltMinId,
                      beltMaxId: data.beltMaxId ?? currentCategory.beltMaxId,
                      weight: data.weight !== undefined ? (data.weight ?? null) : currentCategory.weight, // Maneja 'weight'
                      id: { not: categoryId }
                  }
              });
              if (potentialDuplicate) throw new Error('La combinación actualizada ya existe en otra categoría.');
          }

          // Actualiza el registro
          return tx.championshipCategory.update({
              where: { id: categoryId },
              data: { 
                ...data,
                // Asegura que si 'weight' es 'undefined', no se envíe, pero si es 'null', sí se envíe
                weight: data.weight === undefined ? undefined : (data.weight ?? null)
              },
              include: { // Rellenamos el include
                beltMin: { select: { name: true } },
                beltMax: { select: { name: true } },
                ageRange: { select: { label: true } },
              }
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
        ageRange: { select: { label: true, minAge: true } }, // Añadido minAge
        _count: { select: { participants: true } }
      },
      orderBy: [ // Rellenamos orderBy
        { ageRange: { minAge: 'asc' } },
        { gender: 'asc' },
        { modality: 'asc' },
        { weight: 'asc' }, // Añadido 'weight'
      ]
    });

    // Mapeo directo (con 'weight' añadido)
    return categories.map(cat => ({
      id: cat.id, code: cat.code ?? null, modality: cat.modality, gender: cat.gender,
      weight: cat.weight ?? null, // 👈 AÑADIDO
      ageRangeLabel: cat.ageRange?.label ?? 'N/A',
      beltMinName: cat.beltMin?.name ?? 'N/A',
      beltMaxName: cat.beltMax?.name ?? 'N/A',
      participantCount: cat._count.participants,
    }));
  }

  /**
   * Obtiene categorías PAGINADAS para un campeonato, formateadas.
   */
  async getPaginatedCategories(championshipId: number, params: PaginationParams) {

    const whereClause: Prisma.ChampionshipCategoryWhereInput = {
      championshipId: championshipId,
    };

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
        orderBy: [ // Rellenamos orderBy
          { ageRange: { minAge: 'asc' } },
          { gender: 'asc' },
          { modality: 'asc' },
          { weight: 'asc' }, // Añadido 'weight'
        ]
      }
    );

    // Mapeamos los resultados (con 'weight' añadido)
    const data = result.data.map((cat) => ({
      id: cat.id,
      code: cat.code ?? null,
      modality: cat.modality,
      gender: cat.gender,
      weight: cat.weight ?? null, // 👈 AÑADIDO
      ageRangeLabel: cat.ageRange?.label ?? 'N/A',
      beltMinName: cat.beltMin?.name ?? 'N/A',
      beltMaxName: cat.beltMax?.name ?? 'N/A',
      participantCount: cat._count.participants,
    }));

    return { data, meta: result.meta };
  }

   /**
   * Obtiene UNA categoría por su ID, incluyendo detalles.
   */
  async getCategoryById(id: number) {
      return prisma.championshipCategory.findUnique({
          where: { id },
          include: { // Rellenamos el include
            beltMin: { select: { id: true, name: true, kyuLevel: true } },
            beltMax: { select: { id: true, name: true, kyuLevel: true } },
            ageRange: { select: { id: true, label: true } },
            championship: { select: { id: true, name: true } },
            _count: { select: { participants: true } }
          }
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