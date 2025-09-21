import { PrismaClient } from "@/generated/prisma";
import { CreateRolePayload, UpdateRolePayload } from "./role.types";

const prisma = new PrismaClient();

export class RoleService {
  async create(data: CreateRolePayload) {
    return prisma.role.create({ data });
  }

  async getAll() {
    return prisma.role.findMany({
      include: { users: true }, // opcional: ver los usuarios de cada rol
    });
  }

  async getById(id: number) {
    return prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });
  }

  async update(id: number, data: UpdateRolePayload) {
    return prisma.role.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.role.delete({ where: { id } });
  }
}