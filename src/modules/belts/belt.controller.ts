import { Request, Response } from "express"
import { BeltService } from "./belt.service"

export class BeltController {
  private beltService = new BeltService()

  // 📋 Obtener todos los cinturones
  getAll = async (req: Request, res: Response) => {
    try {
      const belts = await this.beltService.getAll()
      return res.status(200).json(belts)
    } catch (error: any) {
      console.error("❌ Error obteniendo cinturones:", error)
      return res.status(500).json({
        message: "Error al obtener los cinturones",
        details: error.message,
      })
    }
  }
}