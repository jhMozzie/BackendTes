import { Request, Response } from "express";
import { AcademyService } from "./academy.service";
import { CreateAcademyPayload, UpdateAcademyPayload } from "@/types";

export class AcademyController {
  private academyService = new AcademyService();

  // 🏗️ CREATE
  create = async (req: Request<{}, {}, CreateAcademyPayload>, res: Response) => {
    try {
      const newAcademy = await this.academyService.create(req.body);
      return res.status(201).json(newAcademy);
    } catch (error: any) {
      console.error("❌ Error creating academy:", error);
      return res.status(500).json({
        message: "Error creating academy",
        details: error.message,
      });
    }
  };

  // 📋 READ ALL (simple) → para selects en frontend
  getAll = async (_req: Request, res: Response) => {
    try {
      const academies = await this.academyService.getAll();
      return res.status(200).json(academies);
    } catch (error: any) {
      console.error("❌ Error getting academies (simple):", error);
      return res.status(500).json({
        message: "Error getting academies",
        details: error.message,
      });
    }
  };

  // 📋 READ ALL (paginado) → para tablas
  getAllPaginated = async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "10" } = req.query;

      const result = await this.academyService.getAllPaginated({
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error getting academies (paginated):", error);
      return res.status(500).json({
        message: "Error getting academies",
        details: error.message,
      });
    }
  };

  // 🔍 READ BY ID
  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const academy = await this.academyService.getById(id);

      if (!academy) {
        return res.status(404).json({ message: "Academy not found" });
      }

      return res.status(200).json(academy);
    } catch (error: any) {
      console.error("❌ Error getting academy:", error);
      return res.status(500).json({
        message: "Error getting academy",
        details: error.message,
      });
    }
  };

  // ✏️ UPDATE
  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updatedAcademy = await this.academyService.update(
        id,
        req.body as UpdateAcademyPayload
      );

      return res.status(200).json(updatedAcademy);
    } catch (error: any) {
      console.error("❌ Error updating academy:", error);
      return res.status(500).json({
        message: "Error updating academy",
        details: error.message,
      });
    }
  };

  // ❌ DELETE
  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deletedAcademy = await this.academyService.delete(id);

      return res.status(200).json(deletedAcademy);
    } catch (error: any) {
      console.error("❌ Error deleting academy:", error);
      return res.status(500).json({
        message: "Error deleting academy",
        details: error.message,
      });
    }
  };
}