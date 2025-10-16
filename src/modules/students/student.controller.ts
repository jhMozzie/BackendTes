import { Request, Response } from "express";
import { StudentService } from "./student.service";
import { CreateStudentPayload, UpdateStudentPayload } from "@/types";

export class StudentController {
  private studentService = new StudentService();

  // 🏗️ CREATE
  create = async (req: Request<{}, {}, CreateStudentPayload>, res: Response) => {
    try {
      const newStudent = await this.studentService.create(req.body);
      return res.status(201).json(newStudent);
    } catch (error: any) {
      console.error("❌ Error creating student:", error);
      return res.status(500).json({
        message: "Error creating student",
        details: error.message,
      });
    }
  };

  // 📋 READ ALL (paginado + filtro opcional academyId)
  getAll = async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "10", academyId } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const academyIdNum = academyId ? Number(academyId) : undefined;

      const result = await this.studentService.getAllPaginated({
        page: pageNum,
        limit: limitNum,
        academyId: academyIdNum,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Error getting students:", error);
      return res.status(500).json({
        message: "Error getting students",
        details: error.message,
      });
    }
  };

  // 🔍 READ BY ID
  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const student = await this.studentService.getById(id);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      return res.status(200).json(student);
    } catch (error: any) {
      console.error("❌ Error getting student:", error);
      return res.status(500).json({
        message: "Error getting student",
        details: error.message,
      });
    }
  };

  // ✏️ UPDATE
  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updatedStudent = await this.studentService.update(
        id,
        req.body as UpdateStudentPayload
      );

      return res.status(200).json(updatedStudent);
    } catch (error: any) {
      console.error("❌ Error updating student:", error);
      return res.status(500).json({
        message: "Error updating student",
        details: error.message,
      });
    }
  };

  // ❌ DELETE
  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deletedStudent = await this.studentService.delete(id);

      return res.status(200).json(deletedStudent);
    } catch (error: any) {
      console.error("❌ Error deleting student:", error);
      return res.status(500).json({
        message: "Error deleting student",
        details: error.message,
      });
    }
  };
}