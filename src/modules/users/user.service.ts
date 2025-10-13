import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import { CreateUserPayload, UpdateUserPayload } from "./user.types";
import { PaginationParams } from "../common/pagination/pagination.types";
import { paginate } from "../common/pagination/pagination.helper";

const prisma = new PrismaClient();

export class UserService {
  // CREATE
  async create(userData: CreateUserPayload) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        roleId: userData.roleId,
        phone: userData.phone ?? null,
        birthdate: userData.birthdate ? new Date(userData.birthdate) : null,
        status: userData.status ?? "Activo",
      },
      include: {
        role: {
          select: {
            id: true,
            description: true, // 👈 devuelve solo lo necesario para el frontend
          },
        },
      },
    });
  }

  // READ (All)
  async getAll() {
    return prisma.user.findMany({
      include: {
        role: {
          select: {
            id: true,
            description: true, // 👈 Solo el campo que necesitas
          },
        },
      },
    });
  }

  // READ (By ID)
  async getById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            id: true,
            description: true,
          },
        },
      },
    });
  }

  // UPDATE
  async update(id: number, data: UpdateUserPayload) {
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    if (data.birthdate) {
      updateData.birthdate = new Date(data.birthdate);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            description: true,
          },
        },
      },
    });
  }

  // DELETE
  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }

  // GET ALL PAGINATED + FILTER BY ROLE
  async getAllPaginated(params: PaginationParams & { role?: string }) {
    const where: any = {};

    if (params.role && params.role !== "all") {
      where.role = {
        is: {
          description: params.role,
        },
      };
    }

    return paginate(prisma.user, params, {
      where,
      include: {
        role: {
          select: { id: true, description: true },
        },
      },
      // orderBy: { id: "asc" },
    });
  }
}
