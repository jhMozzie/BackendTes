import { Request, Response } from 'express';
import { AddCategoryToChampionshipPayload } from './categoryOnChampionship.types';
import { CategoriesOnChampionshipsService } from './categoryOnChampionship.service';

const service = new CategoriesOnChampionshipsService();

export class CategoriesOnChampionshipsController {
  async addCategory(req: Request<AddCategoryToChampionshipPayload>, res: Response) {
    try {
      const result = await service.addCategory(req.body);
      return res.status(201).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error adding category to championship' });
    }
  }

  async removeCategory(req: Request, res: Response) {
    try {
      const { championshipId, categoryId } = req.params;
      await service.removeCategory(parseInt(championshipId), parseInt(categoryId));
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error removing category from championship' });
    }
  }
}