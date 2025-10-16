import { Router } from "express"
import { BeltController } from "./belt.controller"

const router = Router()
const beltController = new BeltController()

// 📋 Ruta para listar todos los cinturones
router.get("/", beltController.getAll)

export default router