// src/modules/users/user.route.ts
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const controller = new UserController();

// ✅ Ruta principal con paginación
router.get("/", (req, res) => controller.getAllPaginated(req, res));

// 🔍 Obtener usuario por ID
router.get("/:id", (req, res) => controller.getById(req, res));

// ➕ Crear nuevo usuario
router.post("/", (req, res) => controller.create(req, res));

// ✏️ Actualizar usuario
router.put("/:id", (req, res) => controller.update(req, res));

// ❌ Eliminar usuario
router.delete("/:id", (req, res) => controller.delete(req, res));

export default router;