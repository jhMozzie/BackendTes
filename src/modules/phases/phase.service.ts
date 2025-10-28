// src/modules/phases/phase.service.ts

import { PrismaClient, Phase as PrismaPhase } from "@/generated/prisma";
import type { Phase, CreatePhaseDto, UpdatePhaseDto } from "./phase.types";

const prisma = new PrismaClient();


export class PhaseService {
  
  /**
   * Obtiene todas las fases (lista simple, sin paginar).
   * Se usa para configurar el generador de brackets.
   */
  async getAll(): Promise<Phase[]> {
    return prisma.phase.findMany({
      orderBy: { order: 'asc' }
    });
  }

  /**
   * Crea una nueva fase.
   */
  async create(data: CreatePhaseDto): Promise<Phase> {
    return prisma.phase.create({
      data,
    });
  }

  /**
   * Actualiza una fase existente.
   */
  async update(id: number, data: UpdatePhaseDto): Promise<Phase> {
    return prisma.phase.update({
      where: { id },
      data,
    });
  }

  /**
   * Elimina una fase.
   */
  async delete(id: number): Promise<Phase> {
    // Nota: Se asume que no hay referencias a este Phase en la tabla Match.
    return prisma.phase.delete({
      where: { id },
    });
  }
}