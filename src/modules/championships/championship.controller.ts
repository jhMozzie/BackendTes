// src/modules/championships/championship.controller.ts

import { Request, Response } from "express"
import { ChampionshipService } from "./championship.service"
import {
  CreateChampionshipPayload,
  UpdateChampionshipPayload,
} from "./championship.types"
import { uploadBuffer } from "@/lib/cloudinary"

export class ChampionshipController {
  private championshipService = new ChampionshipService()

  // 🏆 CREATE
  create = async (req: Request<{}, {}, CreateChampionshipPayload>, res: Response) => {
    try {
      // If a file was uploaded via multer, upload it to Cloudinary and set the image URL
      const body = { ...req.body } as any

      // Debug: log whether multer provided a file
      console.log('create: req.file present?', !!(req as any).file)

      if ((req as any).file && (req as any).file.buffer) {
        const file = (req as any).file
        const result = await uploadBuffer(file.buffer, file.originalname)
        body.image = result.secure_url
        console.log('create: uploaded to cloudinary:', result.secure_url)
      } else if (body.image && typeof body.image === 'string' && body.image.trim().startsWith('{')) {
        // Fallback: client may have sent a JSON string for image (e.g. "{}") — try to parse and extract secure_url
        try {
          const parsed = JSON.parse(body.image)
          if (parsed && typeof parsed === 'object') {
            const extracted = parsed.secure_url ?? parsed.url
            if (extracted) {
              body.image = extracted
              console.log('create: extracted image from JSON body:', body.image)
            } else {
              // parsed object empty or doesn't include url -> clear image to avoid storing '{}'
              body.image = null
              console.log('create: parsed image JSON had no url, clearing image')
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      const newChampionship = await this.championshipService.create(body)
      return res.status(201).json(newChampionship)
    } catch (error: any) {
      console.error("❌ Error creating championship:", error)
      return res.status(500).json({
        message: "Error creating championship",
        details: error.message,
      })
    }
  }

  // 📋 GET ALL (lista simple sin paginar)
  getAll = async (_req: Request, res: Response) => {
    try {
      const championships = await this.championshipService.getAll()
      return res.status(200).json(championships)
    } catch (error: any) {
      console.error("❌ Error fetching championships:", error)
      return res.status(500).json({
        message: "Error fetching championships",
        details: error.message,
      })
    }
  }

  // 📄 GET PAGINATED (lista con paginación)
  getPaginated = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 10

      const data = await this.championshipService.getPaginated({ page, limit })
      return res.status(200).json(data)
    } catch (error: any) {
      console.error("❌ Error fetching paginated championships:", error)
      return res.status(500).json({
        message: "Error fetching paginated championships",
        details: error.message,
      })
    }
  }

  // 🔍 GET BY ID
  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10)
      const championship = await this.championshipService.getById(id)

      if (!championship) {
        return res.status(404).json({ message: "Championship not found" })
      }

      return res.status(200).json(championship)
    } catch (error: any) {
      console.error("❌ Error fetching championship:", error)
      return res.status(500).json({
        message: "Error fetching championship",
        details: error.message,
      })
    }
  }

  // ✏️ UPDATE
  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10)
      const body = { ...req.body } as any
      console.log('update: req.file present?', !!(req as any).file)
      if ((req as any).file && (req as any).file.buffer) {
        const file = (req as any).file
        const result = await uploadBuffer(file.buffer, file.originalname)
        body.image = result.secure_url
        console.log('update: uploaded to cloudinary:', result.secure_url)
      } else if (body.image && typeof body.image === 'string' && body.image.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(body.image)
          if (parsed && typeof parsed === 'object') {
            const extracted = parsed.secure_url ?? parsed.url
            if (extracted) {
              body.image = extracted
              console.log('update: extracted image from JSON body:', body.image)
            } else {
              body.image = null
              console.log('update: parsed image JSON had no url, clearing image')
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      const updatedChampionship = await this.championshipService.update(
        id,
        body as UpdateChampionshipPayload
      )

      return res.status(200).json(updatedChampionship)
    } catch (error: any) {
      console.error("❌ Error updating championship:", error)
      return res.status(500).json({
        message: "Error updating championship",
        details: error.message,
      })
    }
  }

  // ❌ DELETE
  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10)
      await this.championshipService.delete(id)
      return res.status(204).send() // 204 = éxito sin contenido
    } catch (error: any) {
      console.error("❌ Error deleting championship:", error)
      return res.status(500).json({
        message: "Error deleting championship",
        details: error.message,
      })
    }
  }
}