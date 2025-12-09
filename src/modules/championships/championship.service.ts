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
    // Normalizar y validar tipos que pueden venir como strings desde form-data
    const rawAcademyId: any = (data as any).academyId
    const academyId = rawAcademyId !== undefined && rawAcademyId !== null ? Number(rawAcademyId) : undefined

    if (!academyId || Number.isNaN(academyId)) throw new Error("El ID de la academia es obligatorio y debe ser un número.")

    const champData: any = { ...data }

    // Coerciones seguras
    if (champData.referees !== undefined && champData.referees !== null && champData.referees !== '') {
      const r = Number(champData.referees)
      champData.referees = Number.isNaN(r) ? null : r
    } else {
      champData.referees = null
    }

    if (champData.tatamis !== undefined && champData.tatamis !== null && champData.tatamis !== '') {
      const t = Number(champData.tatamis)
      champData.tatamis = Number.isNaN(t) ? null : t
    } else {
      champData.tatamis = null
    }

    // Normalizar image: si viene como objeto (por algún middleware), intentar extraer secure_url
    if (champData.image && typeof champData.image === 'object') {
      champData.image = champData.image.secure_url ?? champData.image.url ?? null
    }

    // Si viene como string JSON vacío '{}' o similar, evitar guardar la cadena '{}'
    if (typeof champData.image === 'string') {
      const s = champData.image.trim()
      if (s === '{}' || s === '' || s === 'null') {
        champData.image = null
      }
    }

    const newChampionship = await prisma.championship.create({
      data: {
        name: champData.name,
        description: champData.description ?? null,
        startDate: new Date(champData.startDate),
        location: champData.location,
        district: champData.district ?? null,
        province: champData.province ?? null,
        country: champData.country ?? null,
        status: champData.status ?? undefined,
        referees: champData.referees,
        tatamis: champData.tatamis,
        image: champData.image ?? null,
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
    const champData: any = { ...data }

    if (champData.referees !== undefined && champData.referees !== null && champData.referees !== '') {
      const r = Number(champData.referees)
      champData.referees = Number.isNaN(r) ? undefined : r
    }

    if (champData.tatamis !== undefined && champData.tatamis !== null && champData.tatamis !== '') {
      const t = Number(champData.tatamis)
      champData.tatamis = Number.isNaN(t) ? undefined : t
    }

    if (champData.image && typeof champData.image === 'object') {
      champData.image = champData.image.secure_url ?? champData.image.url ?? JSON.stringify(champData.image)
    }

    const { startDate, ...rest } = champData

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