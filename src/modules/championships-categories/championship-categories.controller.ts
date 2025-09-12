import { Request, Response } from 'express';
import { ChampionshipCategoryService } from './championship-categories.service';
import { CreateChampionshipCategoryPayload } from './championship-categories.types';

const service = new ChampionshipCategoryService();

export class ChampionshipCategoryController {

  async getAllByChampionship(req: Request, res: Response) {
    try {
      const championshipId = parseInt(req.params.championshipId);
      const categories = await service.getCategoriesByChampionshipId(championshipId);
      return res.status(200).json(categories);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Crea una nueva categoría en un campeonato.
   * Corresponde a la ruta POST /championships/:championshipId/categories
   */
  async create(req: Request, res: Response) {
    try {
      const championshipId = parseInt(req.params.championshipId);
      // CORRECCIÓN: Llamamos al método correcto 'createCategory'
      const newCategory = await service.createCategory(championshipId, req.body as CreateChampionshipCategoryPayload);
      return res.status(201).json(newCategory);
    } catch (error: any) {
      // Devolvemos el mensaje de error de la validación (ej. código duplicado)
      return res.status(400).json({ message: error.message });
    }
  }

  /**
   * Actualiza una categoría existente.
   * Corresponde a la ruta PUT /championship-categories/:categoryId
   */
  async update(req: Request, res: Response) {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const updatedCategory = await service.updateCategory(categoryId, req.body as Partial<CreateChampionshipCategoryPayload>);
      return res.status(200).json(updatedCategory);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  /**
   * Elimina una categoría.
   * Corresponde a la ruta DELETE /championship-categories/:categoryId
   */
  async delete(req: Request, res: Response) {
    try {
      const categoryId = parseInt(req.params.categoryId);
      // CORRECCIÓN: Llamamos al método correcto 'deleteCategory'
      await service.deleteCategory(categoryId);
      return res.status(204).send(); // 204 No Content
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}