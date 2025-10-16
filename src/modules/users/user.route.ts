// src/modules/users/user.route.ts
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const controller = new UserController();

// ✅ Ruta principal con paginación
router.get("/", controller.getAllPaginated);

// 📋 Obtener todos los usuarios (sin paginación, opcional si la usas)
router.get("/all", controller.getAll);

// 🔍 Obtener usuario por ID
router.get("/:id", controller.getById);

// ➕ Crear nuevo usuario
router.post("/", controller.create);

// ✏️ Actualizar usuario
router.put("/:id", controller.update);

// ❌ Eliminar usuario
router.delete("/:id", controller.delete);

export default router;