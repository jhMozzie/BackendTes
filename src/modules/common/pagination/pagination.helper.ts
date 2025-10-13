import { PrismaClient } from "@/generated/prisma"
import { PaginationParams, PaginationResult } from "./pagination.types"

const prisma = new PrismaClient()

export async function paginate<T>(
  model: any, // Modelo Prisma (ej: prisma.user)
  params: PaginationParams = {},
  queryOptions: Record<string, any> = {} // Filtros opcionales
): Promise<PaginationResult<T>> {
  const page = params.page && params.page > 0 ? params.page : 1
  const limit = params.limit && params.limit > 0 ? params.limit : 10
  const skip = (page - 1) * limit

  // 🔍 Extraemos "where" antes para usarlo en ambos queries
  const where = queryOptions.where || {}

  const [data, total] = await Promise.all([
    model.findMany({
      skip,
      take: limit,
      ...queryOptions,
    }),
    model.count({ where }), // ✅ Cuenta respetando relaciones (role.is, etc.)
  ])

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}