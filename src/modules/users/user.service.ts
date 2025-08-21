import { PrismaClient } from "@/generated/prisma";
import { CreateUserPayload, UpdateUserPayload } from './user.types';

const prisma = new PrismaClient();

export class UserService {
  // CREATE
  async create(userData: CreateUserPayload) {
    const newUser = await prisma.user.create({ data: userData });
    return newUser;
  }

  // READ (All)
  async getAll() {
    return prisma.user.findMany();
  }

  // READ (By ID)
  async getById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }

  // UPDATE
  async update(id: number, data: UpdateUserPayload) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  // DELETE
  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}
