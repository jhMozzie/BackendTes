// src/academies-championships/academy-championships.service.ts

import { PrismaClient } from '@/generated/prisma';
import { 
  ParticipationStatus,
  CreateParticipationDto,
  UpdateParticipationStatusDto,
  ParticipationResponse
} from './academy-championships.types';

const prisma = new PrismaClient();

export class AcademyChampionshipService {
  
  /**
   * Crear participación inicial (estado "Participar")
   * Se ejecuta cuando la academia hace click en "Participar"
   */
  async createParticipation(data: CreateParticipationDto): Promise<ParticipationResponse> {
    const { academyId, championshipId, status } = data;

    return await prisma.academyOnChampionships.upsert({
      where: {
        academyId_championshipId: {
          academyId,
          championshipId
        }
      },
      update: {
        status: status || ParticipationStatus.PARTICIPANDO
      },
      create: {
        academyId,
        championshipId,
        status: status || ParticipationStatus.PARTICIPANDO
      },
      include: {
        academy: { select: { id: true, name: true } },
        championship: { select: { id: true, name: true, startDate: true } }
      }
    });
  }

  /**
   * Actualizar estado de participación manualmente
   */
  async updateStatus(
    academyId: number, 
    championshipId: number, 
    data: UpdateParticipationStatusDto
  ): Promise<ParticipationResponse> {
    return await prisma.academyOnChampionships.update({
      where: {
        academyId_championshipId: {
          academyId,
          championshipId
        }
      },
      data: {
        status: data.status
      },
      include: {
        academy: { select: { id: true, name: true } },
        championship: { select: { id: true, name: true, startDate: true } }
      }
    });
  }

  /**
   * Obtener participación específica
   */
  async getParticipation(academyId: number, championshipId: number): Promise<ParticipationResponse | null> {
    return await prisma.academyOnChampionships.findUnique({
      where: {
        academyId_championshipId: {
          academyId,
          championshipId
        }
      },
      include: {
        academy: { select: { id: true, name: true } },
        championship: { select: { id: true, name: true, startDate: true } }
      }
    });
  }

  /**
   * Verificar si la academia tiene participantes inscritos en este campeonato
   */
  async hasParticipants(academyId: number, championshipId: number): Promise<number> {
    const count = await prisma.participant.count({
      where: {
        student: {
          academyId
        },
        championshipCategory: {
          championshipId
        }
      }
    });
    return count;
  }

  /**
   * Avanzar al siguiente estado automáticamente según la lógica de negocio
   * Flujo: Participar -> Participando -> PreInscrito -> Confirmado
   */
  async advanceStatus(academyId: number, championshipId: number): Promise<ParticipationResponse> {
    const participation = await this.getParticipation(academyId, championshipId);
    
    if (!participation) {
      // Si no existe, crear como "Participando"
      return await this.createParticipation({ 
        academyId, 
        championshipId,
        status: ParticipationStatus.PARTICIPANDO 
      });
    }

    let newStatus: ParticipationStatus;
    const participantCount = await this.hasParticipants(academyId, championshipId);

    // Lógica de transición de estados
    switch (participation.status) {
      case ParticipationStatus.PARTICIPAR:
      case ParticipationStatus.PARTICIPANDO:
        // Verificar si tiene participantes antes de pasar a PreInscrito
        if (participantCount > 0) {
          newStatus = ParticipationStatus.PRE_INSCRITO;
        } else {
          throw new Error(
            `Debe registrar al menos un participante antes de avanzar. Participantes actuales: ${participantCount}`
          );
        }
        break;
      
      case ParticipationStatus.PRE_INSCRITO:
        // Confirmar participación
        newStatus = ParticipationStatus.CONFIRMADO;
        break;
      
      case ParticipationStatus.CONFIRMADO:
        // Ya está confirmado, no hacer nada
        throw new Error('La participación ya está confirmada');
      
      default:
        throw new Error(`Estado de participación no válido: ${participation.status}`);
    }

    return await this.updateStatus(academyId, championshipId, { status: newStatus });
  }

  /**
   * Obtener todas las participaciones de una academia
   */
  async getAcademyParticipations(academyId: number): Promise<ParticipationResponse[]> {
    return await prisma.academyOnChampionships.findMany({
      where: { academyId },
      include: {
        championship: { select: { id: true, name: true, startDate: true } }
      },
      orderBy: { championship: { startDate: 'desc' } }
    });
  }

  /**
   * Obtener todas las academias participantes de un campeonato
   */
  async getChampionshipParticipations(championshipId: number): Promise<ParticipationResponse[]> {
    return await prisma.academyOnChampionships.findMany({
      where: { championshipId },
      include: {
        academy: { select: { id: true, name: true } }
      },
      orderBy: { academy: { name: 'asc' } }
    });
  }

  /**
   * Eliminar participación (cancelar participación)
   */
  async deleteParticipation(academyId: number, championshipId: number): Promise<void> {
    await prisma.academyOnChampionships.delete({
      where: {
        academyId_championshipId: {
          academyId,
          championshipId
        }
      }
    });
  }

  /**
   * Obtener estadísticas de participación de un campeonato
   */
  async getParticipationStats(championshipId: number) {
    const participations = await this.getChampionshipParticipations(championshipId);
    
    return {
      total: participations.length,
      byStatus: {
        participar: participations.filter(p => p.status === ParticipationStatus.PARTICIPAR).length,
        participando: participations.filter(p => p.status === ParticipationStatus.PARTICIPANDO).length,
        preInscrito: participations.filter(p => p.status === ParticipationStatus.PRE_INSCRITO).length,
        confirmado: participations.filter(p => p.status === ParticipationStatus.CONFIRMADO).length,
      }
    };
  }
}
