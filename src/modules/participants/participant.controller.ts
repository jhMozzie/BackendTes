import { Request, Response } from 'express';
import { ParticipantService } from './participant.service';
import { CreateParticipantPayload } from './participant.types';

// Instanciamos el servicio que contiene la lógica de negocio
const service = new ParticipantService();

export class ParticipantController {

  /**
   * Crea una nueva inscripción de participante.
   * Corresponde a la ruta: POST /participants
   */
  async create(req: Request, res: Response) {
    try {
      // El body de la petición debe coincidir con la interfaz CreateParticipantPayload
      const newParticipant = await service.create(req.body as CreateParticipantPayload);
      return res.status(201).json(newParticipant);
    } catch (error: any) {
      // Captura errores, como violaciones de constraints (ej. inscribir al mismo alumno dos veces)
      return res.status(400).json({ message: error.message });
    }
  }

  /**
   * Obtiene una lista de todos los participantes.
   * Corresponde a la ruta: GET /participants
   */
  async getAll(req: Request, res: Response) {
    try {
      const participants = await service.getAll();
      return res.status(200).json(participants);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Obtiene un participante específico por su ID.
   * Corresponde a la ruta: GET /participants/:id
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const participant = await service.getById(id);
      
      // Si no se encuentra el participante, devolvemos un 404
      if (!participant) {
        return res.status(404).json({ message: 'Participante no encontrado.' });
      }
      
      return res.status(200).json(participant);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Elimina un participante.
   * Corresponde a la ruta: DELETE /participants/:id
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await service.delete(id);
      // El código 204 No Content es la respuesta estándar para un delete exitoso
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}
