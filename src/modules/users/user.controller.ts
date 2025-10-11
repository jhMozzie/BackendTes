import { Request, Response } from "express";
import { UserService } from "./user.service";
import { CreateUserPayload, UpdateUserPayload } from "./user.types";

const userService = new UserService();

export class UserController {
  // CREATE
  async create(req: Request, res: Response) {
    try {
      const newUser = await userService.create(req.body as CreateUserPayload);
      return res.status(201).json(newUser);
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "El correo ya está registrado" });
      }
      console.error("Error creando usuario:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  // READ ALL
  async getAll(_req: Request, res: Response) {
    try {
      const users = await userService.getAll();
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      return res.status(500).json({ message: "Error obteniendo usuarios" });
    }
  }

  // READ BY ID
  async getById(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const user = await userService.getById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  // UPDATE
  async update(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const updatedUser = await userService.update(
        userId,
        req.body as UpdateUserPayload
      );
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  // DELETE
  async delete(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const deletedUser = await userService.delete(userId);
      return res.status(200).json(deletedUser);
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }
}