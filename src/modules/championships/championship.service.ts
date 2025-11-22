import { PrismaClient, Championship } from "@prisma/client"
import { paginate } from "@/modules/common/pagination/pagination.helper"
import {
  PaginationParams,
  CreateChampionshipPayload,
  UpdateChampionshipPayload,
} from "@/types"

const prisma = new PrismaClient()

export class ChampionshipService {
  // 🏗️ CREATE
  async create(data: CreateChampionshipPayload) {
    const { academyId, ...champData } = data

    if (!academyId) throw new Error("El ID de la academia es obligatorio.")

    const newChampionship = await prisma.championship.create({
      data: { 
        ...champData,
        startDate: new Date(champData.startDate),
        academy: { connect: { id: academyId } },
      },
      include: {
        academy: {
          select: { id: true, name: true },
        },
      },
    })

    return newChampionship
  }

  // 📋 READ ALL (lista simple)
  async getAll() {
    return prisma.championship.findMany({
      include: {
        academy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDate: "desc" },
    })
  }

  // 📄 READ (paginado)
  async getPaginated(params: PaginationParams) {
    const result = await paginate<
      Championship & {
        academy: {
          id: number
          name: string
        } | null
      }
    >(prisma.championship, params, {
      include: {
        academy: {
          select: { id: true, name: true },
        },
      },
      // orderBy: { startDate: "desc" },
    })

    // ✨ Mapeo opcional para formatear datos al frontend
    const data = result.data.map((champ) => ({
      id: champ.id,
      name: champ.name,
      startDate: champ.startDate,
      location: champ.location,
      district: champ.district ?? "—",
      province: champ.province ?? "—",
      country: champ.country ?? "—",
      description: champ.description ?? "Sin descripción",
      image: champ.image ?? "",
      status: champ.status,
      academy: champ.academy ? champ.academy.name : "Sin academia",
      referees: champ.referees ?? null,
      tatamis: champ.tatamis ?? null,
    }))

    return { data, meta: result.meta }
  }

  // 🔍 READ BY ID
  async getById(id: number) {
    return prisma.championship.findUnique({
      where: { id },
      include: {
        academy: {
          select: { id: true, name: true },
        },
        categories: true,
      },
    })
  }

  // ✏️ UPDATE
  async update(id: number, data: UpdateChampionshipPayload) {
    const { startDate, ...rest } = data

    return prisma.championship.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
      },
      include: {
        academy: {
          select: { id: true, name: true },
        },
      },
    })
  }

  // ❌ DELETE
  async delete(id: number) {
    await prisma.championshipCategory.deleteMany({
      where: { championshipId: id },
    })

    return prisma.championship.delete({
      where: { id },
    })
  }
}