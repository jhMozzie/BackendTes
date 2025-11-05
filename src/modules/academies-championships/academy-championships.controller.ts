// src/modules/academies-championships/academy-championships.controller.ts

import { Request, Response } from 'express';
import { AcademyChampionshipService } from './academy-championships.service';
import { CreateParticipationDto, UpdateParticipationStatusDto } from './academy-championships.types';
import { Prisma } from '@/generated/prisma';

export class AcademyChampionshipController {
  private service = new AcademyChampionshipService();

  /**
   * POST /api/academy-championships
   * Crear participación (click en "Participar")
   */
  createParticipation = async (req: Request, res: Response) => {
    try {
      const data = req.body as CreateParticipationDto;
      const result = await this.service.createParticipation(data);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error("❌ Error creating participation:", error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(400).json({
          message: "La academia ya está registrada en este campeonato.",
          details: error.message
        });
      }
      
      return res.status(500).json({ 
        message: "Error al crear participación",
        details: error.message 
      });
    }
  }

  /**
   * GET /api/academy-championships/:academyId/:championshipId
   * Obtener participación específica
   */
  getParticipation = async (req: Request, res: Response) => {
    try {
      const academyId = parseInt(req.params.academyId, 10);
      const championshipId = parseInt(req.params.championshipId, 10);

      if (isNaN(academyId) || isNaN(championshipId)) {
        return res.status(400).json({ message: "IDs inválidos." });
      }

      const result = await this.service.getParticipation(academyId, championshipId);
      
      if (!result) {
        return res.status(404).json({ 
          message: "Participación no encontrada" 
        });
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error getting participation:", error);
      return res.status(500).json({ 
        message: "Error al obtener participación",
        details: error.message 
      });
    }
  }

  /**
   * PATCH /api/academy-championships/:academyId/:championshipId/status
   * Actualizar estado manualmente
   */
  updateStatus = async (req: Request, res: Response) => {
    try {
      const academyId = parseInt(req.params.academyId, 10);
      const championshipId = parseInt(req.params.championshipId, 10);
      const data = req.body as UpdateParticipationStatusDto;

      if (isNaN(academyId) || isNaN(championshipId)) {
        return res.status(400).json({ message: "IDs inválidos." });
      }

      const result = await this.service.updateStatus(academyId, championshipId, data);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error updating status:", error);
      return res.status(500).json({ 
        message: "Error al actualizar estado",
        details: error.message 
      });
    }
  }

  /**
   * POST /api/academy-championships/:academyId/:championshipId/advance
   * Avanzar al siguiente estado automáticamente
   */
  advanceStatus = async (req: Request, res: Response) => {
    try {
      const academyId = parseInt(req.params.academyId, 10);
      const championshipId = parseInt(req.params.championshipId, 10);

      if (isNaN(academyId) || isNaN(championshipId)) {
        return res.status(400).json({ message: "IDs inválidos." });
      }

      const result = await this.service.advanceStatus(academyId, championshipId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error advancing status:", error);
      return res.status(400).json({ 
        message: error.message || "Error al avanzar estado",
        details: error.message 
      });
    }
  }

  /**
   * GET /api/academy-championships/academy/:academyId
   * Obtener todas las participaciones de una academia
   */
  getAcademyParticipations = async (req: Request, res: Response) => {
    try {
      const academyId = parseInt(req.params.academyId, 10);

      if (isNaN(academyId)) {
        return res.status(400).json({ message: "ID de academia inválido." });
      }

      const result = await this.service.getAcademyParticipations(academyId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error getting academy participations:", error);
      return res.status(500).json({ 
        message: "Error al obtener participaciones",
        details: error.message 
      });
    }
  }

  /**
   * GET /api/academy-championships/championship/:championshipId
   * Obtener todas las academias participantes de un campeonato
   */
  getChampionshipParticipations = async (req: Request, res: Response) => {
    try {
      const championshipId = parseInt(req.params.championshipId, 10);

      if (isNaN(championshipId)) {
        return res.status(400).json({ message: "ID de campeonato inválido." });
      }

      const result = await this.service.getChampionshipParticipations(championshipId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error getting championship participations:", error);
      return res.status(500).json({ 
        message: "Error al obtener participaciones",
        details: error.message 
      });
    }
  }

  /**
   * GET /api/academy-championships/championship/:championshipId/stats
   * Obtener estadísticas de participación
   */
  getParticipationStats = async (req: Request, res: Response) => {
    try {
      const championshipId = parseInt(req.params.championshipId, 10);

      if (isNaN(championshipId)) {
        return res.status(400).json({ message: "ID de campeonato inválido." });
      }

      const result = await this.service.getParticipationStats(championshipId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error getting participation stats:", error);
      return res.status(500).json({ 
        message: "Error al obtener estadísticas",
        details: error.message 
      });
    }
  }

  /**
   * DELETE /api/academy-championships/:academyId/:championshipId
   * Cancelar participación
   */
  deleteParticipation = async (req: Request, res: Response) => {
    try {
      const academyId = parseInt(req.params.academyId, 10);
      const championshipId = parseInt(req.params.championshipId, 10);

      if (isNaN(academyId) || isNaN(championshipId)) {
        return res.status(400).json({ message: "IDs inválidos." });
      }

      await this.service.deleteParticipation(academyId, championshipId);
      return res.status(200).json({ 
        message: "Participación cancelada exitosamente" 
      });
    } catch (error: any) {
      console.error("❌ Error deleting participation:", error);
      return res.status(500).json({ 
        message: "Error al cancelar participación",
        details: error.message 
      });
    }
  }
}
