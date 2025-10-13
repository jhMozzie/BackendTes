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
        return res.status(409).json({ message: "Email already exists" });
      }
      console.error(error);
      return res.status(500).json({ message: "Error creating user" });
    }
  }

  // READ ALL
  async getAll(req: Request, res: Response) {
    try {
      const users = await userService.getAll();
      return res.status(200).json(users);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching users" });
    }
  }

  // READ BY ID
  async getById(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const user = await userService.getById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json(user);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching user" });
    }
  }

  // UPDATE
  async update(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const updatedUser = await userService.update(
        userId,
        req.body as UpdateUserPayload
      );
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error updating user" });
    }
  }

  // DELETE
  async delete(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const deletedUser = await userService.delete(userId);
      return res.status(200).json(deletedUser);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error deleting user" });
    }
  }

  // GET ALL PAGINATED
  async getAllPaginated(req: Request, res: Response) {
  try {
    const { page = "1", limit = "10", role = "all" } = req.query;

    const data = await userService.getAllPaginated({
      page: Number(page),
      limit: Number(limit),
      role: String(role),
    });

    return res.json(data);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
}