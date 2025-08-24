import { Request, Response } from 'express';
import { ChampionshipService } from './championship.service';
import { CreateChampionshipPayload, UpdateChampionshipPayload } from './championship.types';

const championshipService = new ChampionshipService();

export class ChampionshipController {
  async create(req: Request<CreateChampionshipPayload>, res: Response) {
    try {
      const newChampionship = await championshipService.create(req.body);
      return res.status(201).json(newChampionship);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating championship' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const championships = await championshipService.getAll();
      return res.status(200).json(championships);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching championships' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const championship = await championshipService.getById(id);
      if (!championship) {
        return res.status(404).json({ message: 'Championship not found' });
      }
      return res.status(200).json(championship);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching championship' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updatedChampionship = await championshipService.update(id, req.body as UpdateChampionshipPayload);
      return res.status(200).json(updatedChampionship);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating championship' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deletedChampionship = await championshipService.delete(id);
      return res.status(200).json(deletedChampionship);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting championship' });
    }
  }
}