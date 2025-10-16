import { Router } from "express";
import { AcademyController } from "./academy.controller";

const router = Router();
const controller = new AcademyController();

// ⚠️ Importante: el orden de las rutas
router.get("/", controller.getAll);                 // ✅ Lista simple
router.get("/paginated", controller.getAllPaginated); // ✅ Lista paginada
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;