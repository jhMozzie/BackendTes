import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import { CreateUserPayload, UpdateUserPayload } from "./user.types";

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
      },
      include: { role: true },
    });
  }

  // READ (All)
  async getAll() {
    return prisma.user.findMany({
      include: { role: true },
    });
  }

  // READ (By ID)
  async getById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  // UPDATE
  async update(id: number, data: UpdateUserPayload) {
    let updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  // DELETE
  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}