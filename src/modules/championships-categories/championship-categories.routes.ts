import { Router } from "express";
import { ChampionshipCategoryController } from "./championship-categories.controller";

const router = Router();
const controller = new ChampionshipCategoryController();

// --- NUEVA RUTA AÑADIDA ---
// Ruta para LISTAR todas las categorías de un campeonato específico
// Ejemplo: GET /api/championships/1/categories
router.get('/championships/:championshipId/categories', controller.getAllByChampionship);


// Ruta para AÑADIR una categoría a un campeonato específico
router.post('/championships/:championshipId/categories', controller.create);

// Ruta para ELIMINAR una categoría específica por su ID
router.delete('/championship-categories/:categoryId', controller.delete);

export default router;
