import { Request, Response } from 'express';
import { ParticipantService } from './participant.service';
import { CreateParticipantPayload } from './participant.types';
import { PaginationParams } from '@/types'; // Importado de tu tipo global

export class ParticipantController {
  private participantService = new ParticipantService();

  /**
   * POST /participants (Crea una inscripción)
   */
  create = async (req: Request, res: Response) => {
    try {
      const newParticipant = await this.participantService.create(req.body as CreateParticipantPayload);
      return res.status(201).json(newParticipant);
    } catch (error: any) {
      console.error("❌ Error creating participant:", error);
      // Prisma lanza un error 400 si violamos el @@unique (doble inscripción)
      return res.status(400).json({ 
        message: "Error creating participant",
        details: error.message 
      });
    }
  }

  /**
   * GET /participants (Obtiene participantes PAGINADOS con filtros)
   * Este método maneja tanto la lista simple como la paginada.
   */
  getAll = async (req: Request, res: Response) => {
    try {
      // Extraemos page y limit del query params (igual que en student)
      const { page = "1", limit = "10", championshipId, categoryId, studentId } = req.query;

      const params: PaginationParams = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      // Filtros opcionales
      const filters = {
        championshipId: championshipId ? Number(championshipId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        studentId: studentId ? Number(studentId) : undefined,
      };

      // El servicio getPaginated manejará el filtro
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
   * DELETE /participants/:id (Elimina un participante)
   */
  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }
      const deletedParticipant = await this.participantService.delete(id);
      // Devuelve el objeto eliminado (estilo StudentController)
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