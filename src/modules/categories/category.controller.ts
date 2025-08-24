import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { CreateCategoryPayload, UpdateCategoryPayload } from './category.types';

const categoryService = new CategoryService();

export class CategoryController {
  async create(req: Request<{}, {}, CreateCategoryPayload>, res: Response) {
    try {
      const newCategory = await categoryService.create(req.body);
      return res.status(201).json(newCategory);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating category' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const categories = await categoryService.getAll();
      return res.status(200).json(categories);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching categories' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const category = await categoryService.getById(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      return res.status(200).json(category);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching category' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updatedCategory = await categoryService.update(id, req.body as UpdateCategoryPayload);
      return res.status(200).json(updatedCategory);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating category' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deletedCategory = await categoryService.delete(id);
      return res.status(200).json(deletedCategory);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting category' });
    }
  }
}