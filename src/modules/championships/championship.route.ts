// src/modules/championships/championship.route.ts

import { Router } from "express"
import { ChampionshipController } from "./championship.controller"

const router = Router()
const controller = new ChampionshipController()

// ⚠️ Orden de las rutas: primero las específicas, luego las dinámicas
router.get("/", controller.getAll)                 // ✅ Lista simple
router.get("/paginated", controller.getPaginated)  // ✅ Lista paginada
router.get("/:id", controller.getById)             // ✅ Obtener por ID
router.post("/", controller.create)                // ✅ Crear campeonato
router.put("/:id", controller.update)              // ✅ Actualizar campeonato
router.delete("/:id", controller.delete)           // ✅ Eliminar campeonato

export default router