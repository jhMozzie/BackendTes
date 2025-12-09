// src/modules/championships/championship.route.ts

import { Router } from "express"
import multer from 'multer'
import { ChampionshipController } from "./championship.controller"

const router = Router()
const controller = new ChampionshipController()

// multer memory storage: we stream the buffer to Cloudinary
const upload = multer({ storage: multer.memoryStorage() })

// ⚠️ Orden de las rutas: primero las específicas, luego las dinámicas
router.get("/", controller.getAll)                 // ✅ Lista simple
router.get("/paginated", controller.getPaginated)  // ✅ Lista paginada
router.get("/:id", controller.getById)             // ✅ Obtener por ID
// Accept multipart/form-data with field `image` (optional)
router.post("/", upload.single('image'), controller.create)                // ✅ Crear campeonato
router.put("/:id", upload.single('image'), controller.update)              // ✅ Actualizar campeonato
router.delete("/:id", controller.delete)           // ✅ Eliminar campeonato

export default router