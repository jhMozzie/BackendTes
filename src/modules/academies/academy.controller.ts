import { Request, Response } from "express"
import { AcademyService } from "./academy.service"
import { CreateAcademyPayload, UpdateAcademyPayload } from "@/types" // ✅ ya puedes usar tu barril

const academyService = new AcademyService()

export class AcademyController {
  // 🏗️ CREATE
  async create(req: Request<{}, {}, CreateAcademyPayload>, res: Response) {
    try {
      const newAcademy = await academyService.create(req.body)
      return res.status(201).json(newAcademy)
    } catch (error: any) {
      console.error(error)
      return res.status(500).json({ message: "Error creating academy" })
    }
  }

  // 📋 READ ALL (paginado)
  async getAll(req: Request, res: Response) {
    try {
      // ✅ Extrae page y limit de la query string
      const { page = "1", limit = "10" } = req.query

      // ✅ Llama a getAllPaginated del servicio
      const result = await academyService.getAllPaginated({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      })

      return res.status(200).json(result)
    } catch (error: any) {
      console.error(error)
      return res.status(500).json({ message: "Error getting academies" })
    }
  }

  // 🔍 READ BY ID
  async getById(req: Request, res: Response) {
    try {
      const academy = await academyService.getById(parseInt(req.params.id))
      return res.status(200).json(academy)
    } catch (error: any) {
      console.error(error)
      return res.status(500).json({ message: "Error getting academy" })
    }
  }

  // ✏️ UPDATE
  async update(req: Request, res: Response) {
    try {
      const academy = await academyService.update(
        parseInt(req.params.id),
        req.body as UpdateAcademyPayload
      )
      return res.status(200).json(academy)
    } catch (error: any) {
      console.error(error)
      return res.status(500).json({ message: "Error updating academy" })
    }
  }

  // ❌ DELETE
  async delete(req: Request, res: Response) {
    try {
      const academy = await academyService.delete(parseInt(req.params.id))
      return res.status(200).json(academy)
    } catch (error: any) {
      console.error(error)
      return res.status(500).json({ message: "Error deleting academy" })
    }
  }
}