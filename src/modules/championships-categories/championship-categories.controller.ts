import { Request, Response } from 'express';
import { ChampionshipCategoryService } from './championship-categories.service';
import { CreateChampionshipCategoryPayload } from './championship-categories.types';

const service = new ChampionshipCategoryService();

export class ChampionshipCategoryController {

  async create(req: Request, res: Response) {
    try {
      const championshipId = parseInt(req.params.championshipId);
      const newCategory = await service.addCategoryToChampionship(championshipId, req.body as CreateChampionshipCategoryPayload);
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error adding category to championship' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const categoryId = parseInt(req.params.categoryId);
      await service.removeCategoryFromChampionship(categoryId);
      return res.status(204).send(); // 204 No Content es ideal para un delete exitoso
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error removing category from championship' });
    }
  }

  // --- NUEVO MÉTODO AÑADIDO ---
  async getAllByChampionship(req: Request, res: Response) {
    try {
      const championshipId = parseInt(req.params.championshipId);
      const categories = await service.getCategoriesByChampionshipId(championshipId);
      return res.status(200).json(categories);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching categories for championship' });
    }
  }
}