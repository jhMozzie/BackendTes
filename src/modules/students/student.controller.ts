import { Request, Response } from 'express';
import { StudentService } from './student.service';
import { CreateStudentPayload, UpdateStudentPayload } from './student.types';

const studentService = new StudentService();

export class StudentController {
  // CREATE
  async create(req: Request<CreateStudentPayload>, res: Response) {
    try {
      const newStudent = await studentService.create(req.body);
      return res.status(201).json(newStudent);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating student' });
    }
  }

  // READ ALL
  async getAll(req: Request, res: Response) {
    try {
      // 1. Leemos los parámetros de la URL (query params)
      const { academyId } = req.query;

      // 2. Creamos el objeto de filtros que nuestro servicio espera
      const filters = {
        // Si academyId existe, lo convertimos a número, si no, es undefined
        academyId: academyId ? Number(academyId) : undefined
      };

      // 3. Pasamos el objeto de filtros al servicio
      const students = await studentService.getAll(filters);

      return res.status(200).json(students);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching students' });
    }
  }

  // READ BY ID
  async getById(req: Request, res: Response) {
    try {
      const studentId = parseInt(req.params.id);
      const student = await studentService.getById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      return res.status(200).json(student);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching student' });
    }
  }

  // UPDATE
  async update(req: Request, res: Response) {
    try {
      const studentId = parseInt(req.params.id);
      const updatedStudent = await studentService.update(studentId, req.body as UpdateStudentPayload);
      return res.status(200).json(updatedStudent);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating student' });
    }
  }

  // DELETE
  async delete(req: Request, res: Response) {
    try {
      const studentId = parseInt(req.params.id);
      const deletedStudent = await studentService.delete(studentId);
      return res.status(200).json(deletedStudent);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting student' });
    }
  }
}