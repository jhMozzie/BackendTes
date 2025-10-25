import { Router } from "express";
import { ChampionshipCategoryController } from "./championship-categories.controller";
// Opcional: Importar middlewares si los usas
// import { authMiddleware } from "@/middlewares/auth";

const router = Router();
const controller = new ChampionshipCategoryController();

// --- Rutas Anidadas bajo /championships/:championshipId ---

// GET .../categories/all - Obtiene TODAS las categorías (sin paginar)
router.get(
    '/championships/:championshipId/categories/all',
    // authMiddleware, // Ejemplo
    controller.getAllByChampionship // Llama al método correcto
);

// GET .../categories - Obtiene categorías PAGINADAS (ruta principal)
router.get(
    '/championships/:championshipId/categories',
    // authMiddleware,
    controller.getPaginatedByChampionship // Llama al método de paginación
);

// POST .../categories - Crea una NUEVA categoría
router.post(
    '/championships/:championshipId/categories',
    // authMiddleware,
    controller.create
);


// --- Rutas Específicas para UNA Categoría (/championship-categories/:categoryId) ---

// GET /championship-categories/:categoryId - Obtener detalles de UNA categoría
router.get(
    '/championship-categories/:categoryId',
    // authMiddleware,
    controller.getById // <-- RUTA AÑADIDA
);

// PUT /championship-categories/:categoryId - Actualizar UNA categoría
router.put(
    '/championship-categories/:categoryId',
    // authMiddleware,
    controller.update // <-- RUTA AÑADIDA
);

// DELETE /championship-categories/:categoryId - Eliminar UNA categoría
router.delete(
    '/championship-categories/:categoryId',
    // authMiddleware,
    controller.delete
);

export default router;