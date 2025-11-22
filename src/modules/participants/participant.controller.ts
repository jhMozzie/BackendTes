// src/modules/participants/participant.controller.ts

import { Request, Response } from 'express';
import { ParticipantService } from './participant.service';
import { CreateParticipantPayload, UpdateParticipantPayload } from './participant.types';
import { PaginationParams } from '@/types'; 
// 💥 CORRECCIÓN: Importamos Prisma desde la generación de Prisma
import { Prisma } from '@prisma/client'; 


export class ParticipantController {
  private participantService = new ParticipantService();

  /**
   * POST /participants (Crea una inscripción)
   */
  create = async (req: Request, res: Response) => {
    try {
      console.log("📝 Intentando crear participante con datos:", JSON.stringify(req.body, null, 2));
      const newParticipant = await this.participantService.create(req.body as CreateParticipantPayload);
      return res.status(201).json(newParticipant);
    } catch (error: any) {
      console.error("❌ Error creating participant:", error);
      console.error("❌ Mensaje de error completo:", error.message);
      console.error("❌ Stack trace:", error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return res.status(400).json({
              message: "Error de unicidad: El estudiante ya está inscrito en una de las categorías.",
              details: error.message 
          });
      }
      
      return res.status(400).json({ 
        message: "Error creating participant",
        details: error.message 
      });
    }
  }

  /**
   * GET /participants (Obtiene participantes PAGINADOS con filtros)
   */
  getAll = async (req: Request, res: Response) => {
    try {
      const { 
        page = "1", 
        limit = "10", 
        championshipId, 
        categoryId, 
        studentId,
        academyId // 🆕 Extraer academyId de query params
      } = req.query;

      const params: PaginationParams = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const filters = {
        championshipId: championshipId ? Number(championshipId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        studentId: studentId ? Number(studentId) : undefined,
        academyId: academyId ? Number(academyId) : undefined, // 🆕 Pasar al servicio
      };

      const result = await this.participantService.getPaginated({ ...params, ...filters });
      
      return res.status(200).json(result); 

    } catch (error: any) {
      console.error("❌ Error getting participants:", error);
      return res.status(500).json({ 
        message: "Error getting participants", 
        details: error.message 
      });
    }
  }

  /**
   * GET /participants/:id (Obtiene un participante por ID)
   */
  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }

      const participant = await this.participantService.getById(id);
      
      if (!participant) {
        return res.status(404).json({ message: 'Participante no encontrado.' });
      }
      
      return res.status(200).json(participant);
    } catch (error: any) {
      console.error("❌ Error getting participant:", error);
      return res.status(500).json({ 
        message: "Error getting participant", 
        details: error.message 
      });
    }
  }

  /**
   * PATCH /participants/:id (Edición de inscripción granular)
   */
  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const payload = req.body as UpdateParticipantPayload;

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de inscripción inválido." });
      }
      
      const updatedParticipant = await this.participantService.update(id, payload);
      
      return res.status(200).json(updatedParticipant);
    } catch (error: any) {
      console.error("❌ Error updating participant:", error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return res.status(400).json({
              message: "Error de unicidad: El estudiante ya está inscrito en esa categoría.",
              details: error.message
          });
      }
      
      return res.status(500).json({ 
        message: "Error al actualizar la inscripción.", 
        details: error.message 
      });
    }
  }

  /**
   * DELETE /participants/:id (Elimina un participante)
   */
  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }
      const deletedParticipant = await this.participantService.delete(id);
      return res.status(200).json(deletedParticipant); 
    } catch (error: any) {
      console.error("❌ Error deleting participant:", error);
      return res.status(500).json({ 
        message: "Error deleting participant", 
        details: error.message 
      });
    }
  }
}