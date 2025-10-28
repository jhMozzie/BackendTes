// src/modules/phases/phase.controller.ts

import { Request, Response } from 'express';
import { PhaseService } from './phase.service';
import type { CreatePhaseDto, UpdatePhaseDto } from './phase.types';
import { Prisma } from '@/generated/prisma'; 

export class PhaseController {
  private phaseService = new PhaseService();

  /**
   * GET /phases (Lista completa, no paginada)
   */
  getAll = async (req: Request, res: Response) => {
    try {
      // Usamos getAllPhases() del servicio
      const result = await this.phaseService.getAll();
      return res.status(200).json(result); 
    } catch (error: any) {
      console.error("❌ Error getting phases:", error);
      return res.status(500).json({ 
        message: "Error al obtener fases", 
        details: error.message 
      });
    }
  }

  /**
   * POST /phases (Crear fase)
   */
  create = async (req: Request, res: Response) => {
    try {
      const newPhase = await this.phaseService.create(req.body as CreatePhaseDto);
      return res.status(201).json(newPhase);
    } catch (error: any) {
      console.error("❌ Error creating phase:", error);
      // Manejo de error de unicidad (P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return res.status(400).json({
              message: "Ya existe una fase con ese orden o descripción.",
              details: error.message
          });
      }
      return res.status(400).json({ 
        message: "Error al crear fase",
        details: error.message 
      });
    }
  }

  /**
   * PUT /phases/:id (Actualizar fase)
   */
  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }
      
      const updatedPhase = await this.phaseService.update(id, req.body as UpdatePhaseDto);
      return res.status(200).json(updatedPhase);
    } catch (error: any) {
      console.error("❌ Error updating phase:", error);
      return res.status(500).json({ 
        message: "Error al actualizar fase",
        details: error.message 
      });
    }
  }
  
  /**
   * DELETE /phases/:id (Eliminar fase)
   */
  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }
      
      const deletedPhase = await this.phaseService.delete(id);
      return res.status(200).json(deletedPhase);
    } catch (error: any) {
      console.error("❌ Error deleting phase:", error);
      return res.status(500).json({ 
        message: "Error al eliminar fase",
        details: error.message 
      });
    }
  }
}