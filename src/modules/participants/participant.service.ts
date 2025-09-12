import { PrismaClient } from "@/generated/prisma";
import { CreateParticipantPayload } from './participant.types';

const prisma = new PrismaClient();

export class ParticipantService {
  
  /**
   * Crea una nueva inscripción de participante.
   * Utiliza el payload corregido.
   */
  async create(data: CreateParticipantPayload) {
    return prisma.participant.create({ data });
  }

  /**
   * Obtiene todos los participantes.
   * Utiliza un 'include' anidado para llegar al campeonato.
   */
  async getAll() {
    return prisma.participant.findMany({
      include: {
        student: true,
        // CORRECCIÓN: Primero incluimos la categoría...
        championshipCategory: {
          // ...y DENTRO de la categoría, incluimos el campeonato.
          include: {
            championship: true,
          }
        }
      },
    });
  }

  /**
   * Obtiene un participante por su ID.
   * Aplica la misma lógica de 'include' anidado.
   */
  async getById(id: number) {
    return prisma.participant.findUnique({
      where: { id },
      include: {
        student: true,
        championshipCategory: {
          include: {
            championship: true,
          }
        }
      },
    });
  }

  /**
   * Elimina un participante.
   */
  async delete(id: number) {
    return prisma.participant.delete({ where: { id } });
  }
}
