import { PrismaClient } from "@/generated/prisma";
import { CreateParticipantPayload } from './participant.types';

const prisma = new PrismaClient();

export class ParticipantService {
  async create(data: CreateParticipantPayload) {
    return prisma.participant.create({ data });
  }

  async getAll() {
    return prisma.participant.findMany({
      include: {
        student: true,
        championship: true,
      },
    });
  }

  async getById(id: number) {
    return prisma.participant.findUnique({
      where: { id },
      include: {
        student: true,
        championship: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.participant.delete({ where: { id } });
  }
}