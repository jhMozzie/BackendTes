// src/modules/championships/championship.service.ts

import { PrismaClient } from "@/generated/prisma"
import {
  CreateChampionshipPayload,
  UpdateChampionshipPayload,
} from "./championship.types"

const prisma = new PrismaClient()

export class ChampionshipService {
  // 🏆 CREATE
  create = async (data: CreateChampionshipPayload) => {
    const { academyId, ...champData } = data

    if (!academyId) throw new Error("El ID de la academia es obligatorio.")

    return prisma.championship.create({
      data: {
        ...champData,
        startDate: new Date(champData.startDate),
        academy: { connect: { id: academyId } },
      },
      include: { academy: true },
    })
  }

  // 📋 GET ALL (lista simple)
  getAll = async () => {
    return prisma.championship.findMany({
      include: { academy: true },
      orderBy: { startDate: "desc" },
    })
  }

  // 📄 GET PAGINATED
  getPaginated = async ({
    page,
    limit,
  }: {
    page: number
    limit: number
  }) => {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      prisma.championship.findMany({
        skip,
        take: limit,
        include: { academy: true },
        orderBy: { startDate: "desc" },
      }),
      prisma.championship.count(),
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

  // 🔍 GET BY ID
  getById = async (id: number) => {
    return prisma.championship.findUnique({
      where: { id },
      include: {
        academy: true,
        categories: true,
      },
    })
  }

  // ✏️ UPDATE
  update = async (id: number, data: UpdateChampionshipPayload) => {
    const { startDate, ...rest } = data

    return prisma.championship.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
      },
      include: { academy: true },
    })
  }

  // ❌ DELETE
  delete = async (id: number) => {
    // Borramos categorías relacionadas primero para evitar errores FK
    await prisma.championshipCategory.deleteMany({
      where: { championshipId: id },
    })

    return prisma.championship.delete({
      where: { id },
    })
  }
}