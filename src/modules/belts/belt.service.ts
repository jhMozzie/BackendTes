import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient()

export class BeltService {
  // 📋 Obtener todos los cinturones (ordenados de mayor a menor nivel)
  async getAll() {
    const belts = await prisma.belt.findMany({
      orderBy: { kyuLevel: "desc" },
      select: {
        id: true,
        name: true,
        kyuLevel: true,
      },
    })
    return belts
  }
}