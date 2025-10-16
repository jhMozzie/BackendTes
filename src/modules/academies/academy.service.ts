import { PrismaClient, Academy } from "@/generated/prisma";
import { paginate } from "@/modules/common/pagination/pagination.helper";
import {
  PaginationParams,
  CreateAcademyPayload,
  UpdateAcademyPayload,
} from "@/types"; // 🧩 ¡Importas todo desde el barril!

const prisma = new PrismaClient();

export class AcademyService {
  // 🏗️ CREATE
  async create(academyData: CreateAcademyPayload & { id?: number }) {
    // 🚫 Filtra el id si llega desde el frontend (por defecto 0)
    const { id, ...data } = academyData;

    const newAcademy = await prisma.academy.create({
      data, // solo enviamos name y userId
      include: {
        user: {
          select: { id: true, username: true, email: true, phone: true },
        },
      },
    });

    return newAcademy;
  }

    // 📋 READ ALL (simple) → para selects del frontend
  async getAll() {
    const academies = await prisma.academy.findMany({
      select: {
        id: true,
        name: true,
      },
      // orderBy: { id: "asc" },
    });

    return academies;
  }

  // 📋 READ (All paginated)
  async getAllPaginated(params: PaginationParams) {
    const result = await paginate<
      Academy & {
        user: {
          username: string | null;
          email: string | null;
          phone: string | null;
        } | null;
        _count: { students: number };
      }
    >(prisma.academy, params, {
      include: {
        user: {
          select: { username: true, email: true, phone: true },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { id: "asc" },
    });

    const data = result.data.map((academy) => ({
      id: academy.id,
      name: academy.name,
      instructor: academy.user?.username ?? "—",
      contact: {
        phone: academy.user?.phone ?? "—",
        email: academy.user?.email ?? "—",
      },
      students: academy._count.students,
      status: academy._count.students > 0 ? "Activo" : "Inactivo",
    }));

    return { data, meta: result.meta };
  }

  // 🔍 READ (By ID)
  async getById(id: number) {
    return prisma.academy.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true, phone: true },
        },
        _count: { select: { students: true } },
      },
    });
  }

  // ✏️ UPDATE
  async update(id: number, data: UpdateAcademyPayload) {
    return prisma.academy.update({
      where: { id },
      data,
      include: {
        user: {
          // 👇 IGUAL AQUÍ
          select: { id: true, username: true, email: true, phone: true },
        },
      },
    });
  }

  // ❌ DELETE
  async delete(id: number) {
    return prisma.academy.delete({ where: { id } });
  }
}
