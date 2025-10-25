import { Request, Response } from 'express';
import { ChampionshipCategoryService } from './championship-categories.service';
// 👇 Asegúrate que la ruta a los tipos sea correcta
import { CreateChampionshipCategoryPayload, UpdateChampionshipCategoryPayload } from './championship-categories.types';
// 👇 Importamos el tipo para parámetros de paginación si lo usas
import { PaginationParams } from '@/modules/common/pagination/pagination.types'; // Ajusta la ruta si es necesario

export class ChampionshipCategoryController {
  // 👇 Instanciamos el servicio dentro de la clase
  private championshipCategoryService = new ChampionshipCategoryService();

  /**
   * GET /championships/:championshipId/categories/all
   * Obtiene TODAS las categorías (sin paginar) de un campeonato.
   */
  getAllByChampionship = async (req: Request, res: Response) => {
    try {
      const championshipId = parseInt(req.params.championshipId, 10);
      if (isNaN(championshipId)) {
        return res.status(400).json({ message: "ID de campeonato inválido." });
      }
      const categories = await this.championshipCategoryService.getAllCategoriesByChampionshipId(championshipId);
      return res.status(200).json(categories);
    } catch (error: any) {
      console.error("❌ Error fetching categories:", error); // Log estilo student
      return res.status(500).json({
        message: "Error fetching categories", // Mensaje estilo student
        details: error.message,
      });
    }
  };

  /**
   * GET /championships/:championshipId/categories
   * Obtiene las categorías PAGINADAS de un campeonato.
   */
  getPaginatedByChampionship = async (req: Request, res: Response) => {
      try {
          const championshipId = parseInt(req.params.championshipId, 10);
          if (isNaN(championshipId)) {
            return res.status(400).json({ message: "ID de campeonato inválido." });
          }

          // Extraer page y limit de los query params (igual que en student)
          const { page = "1", limit = "10" } = req.query;
          const pageNum = parseInt(page as string, 10);
          const limitNum = parseInt(limit as string, 10);
          const params: PaginationParams = { page: pageNum, limit: limitNum };

          // Aquí podrías añadir lógica para extraer otros filtros de req.query si los necesitas

          const result = await this.championshipCategoryService.getPaginatedCategories(championshipId, params);
          return res.status(200).json(result);
      } catch (error: any) {
          console.error("❌ Error fetching paginated categories:", error); // Log estilo student
          return res.status(500).json({
            message: "Error fetching paginated categories", // Mensaje estilo student
            details: error.message,
          });
      }
  };

  /**
   * POST /championships/:championshipId/categories
   * Crea una nueva categoría para un campeonato.
   */
  create = async (req: Request, res: Response) => {
    try {
      const championshipId = parseInt(req.params.championshipId, 10);
      if (isNaN(championshipId)) {
        return res.status(400).json({ message: "ID de campeonato inválido." });
      }
      const payload = req.body as CreateChampionshipCategoryPayload;
      // Validación del body podría ir aquí
      const newCategory = await this.championshipCategoryService.createCategory(championshipId, payload);
      return res.status(201).json(newCategory); // 201 Created
    } catch (error: any) {
      console.error("❌ Error creating category:", error); // Log estilo student
      // Devolvemos 500 como en student, aunque 400 podría ser más apropiado para validaciones
      return res.status(500).json({
        message: "Error creating category", // Mensaje estilo student
        details: error.message,
      });
    }
  };

   /**
   * GET /championship-categories/:categoryId
   * Obtiene los detalles de una categoría específica.
   */
  getById = async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId, 10);
       if (isNaN(categoryId)) {
         return res.status(400).json({ message: "ID de categoría inválido." });
       }
      const category = await this.championshipCategoryService.getCategoryById(categoryId);
      if (!category) {
          return res.status(404).json({ message: "Category not found" }); // 404 Not Found (igual que student)
      }
      return res.status(200).json(category);
    } catch (error: any) {
       console.error("❌ Error getting category:", error); // Log estilo student
       return res.status(500).json({
         message: "Error getting category", // Mensaje estilo student
         details: error.message,
        });
    }
  };

  /**
   * PUT /championship-categories/:categoryId
   * Actualiza una categoría específica.
   */
  update = async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId, 10);
       if (isNaN(categoryId)) {
         return res.status(400).json({ message: "ID de categoría inválido." });
       }
      const payload = req.body as UpdateChampionshipCategoryPayload;
      // Validación opcional aquí
      const updatedCategory = await this.championshipCategoryService.updateCategory(categoryId, payload);
      // Podrías chequear si updatedCategory existe si update puede fallar sin lanzar error
      return res.status(200).json(updatedCategory);
    } catch (error: any) {
      console.error("❌ Error updating category:", error); // Log estilo student
      // Devolvemos 500 como en student
      return res.status(500).json({
        message: "Error updating category", // Mensaje estilo student
        details: error.message,
      });
    }
  };

  /**
   * DELETE /championship-categories/:categoryId
   * Elimina una categoría específica.
   */
  delete = async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId, 10);
       if (isNaN(categoryId)) {
         return res.status(400).json({ message: "ID de categoría inválido." });
       }
      // El servicio ahora devuelve la categoría eliminada, podríamos devolverla
      const deletedCategory = await this.championshipCategoryService.deleteCategory(categoryId);
      // Devolvemos 200 con el objeto eliminado, como en student.delete
      return res.status(200).json(deletedCategory);
    } catch (error: any) {
      console.error("❌ Error deleting category:", error); // Log estilo student
      // Devolvemos 500 como en student
      return res.status(500).json({
        message: "Error deleting category", // Mensaje estilo student
        details: error.message,
      });
    }
  };
} // Fin de la clase