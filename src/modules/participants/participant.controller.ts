import { Request, Response } from 'express';
import { ParticipantService } from './participant.service';
import { CreateParticipantPayload } from './participant.types';

const participantService = new ParticipantService();

export class ParticipantController {
  async create(req: Request<{}, {}, CreateParticipantPayload>, res: Response) {
    try {
      const newParticipant = await participantService.create(req.body);
      return res.status(201).json(newParticipant);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating participant' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const participants = await participantService.getAll();
      return res.status(200).json(participants);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching participants' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const participant = await participantService.getById(id);
      if (!participant) {
        return res.status(404).json({ message: 'Participant not found' });
      }
      return res.status(200).json(participant);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching participant' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deletedParticipant = await participantService.delete(id);
      return res.status(200).json(deletedParticipant);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting participant' });
    }
  }
}