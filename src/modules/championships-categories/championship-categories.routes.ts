import { Router } from "express";
import { ChampionshipCategoryController } from "./championship-categories.controller";

const router = Router();
const controller = new ChampionshipCategoryController();

// --- Rutas Anidadas bajo /championships/:championshipId ---

// GET .../categories/all - Obtiene TODAS las categorías (sin paginar)
router.get(
    '/championships/:championshipId/categories/all',
    controller.getAllByChampionship
);

// GET .../categories - Obtiene categorías PAGINADAS (ruta principal)
router.get(
    '/championships/:championshipId/categories',
    controller.getPaginatedByChampionship
);

// POST .../categories - Crea una NUEVA categoría
router.post(
    '/championships/:championshipId/categories',
    controller.create
);


// --- Rutas Específicas ---

// 🆕 GET /championship-categories/form-data - DEBE IR PRIMERO (antes de :categoryId)
router.get(
    '/championship-categories/form-data',
    controller.getFormData
);

// GET /championship-categories/:categoryId - Obtener detalles de UNA categoría
router.get(
    '/championship-categories/:categoryId',
    controller.getById
);

// PUT /championship-categories/:categoryId - Actualizar UNA categoría
router.put(
    '/championship-categories/:categoryId',
    controller.update
);

// DELETE /championship-categories/:categoryId - Eliminar UNA categoría
router.delete(
    '/championship-categories/:categoryId',
    controller.delete
);

export default router;