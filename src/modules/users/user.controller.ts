import { Request, Response } from "express";
import { UserService } from "./user.service";
import { CreateUserPayload, UpdateUserPayload } from "./user.types";

export class UserController {
  private userService = new UserService();

  // 🏗️ CREATE
  create = async (req: Request<{}, {}, CreateUserPayload>, res: Response) => {
    try {
      const newUser = await this.userService.create(req.body);

      return res.status(201).json(newUser);
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Email already exists" });
      }

      console.error("❌ Error creating user:", error);
      return res.status(500).json({
        message: "Error creating user",
        details: error.message,
      });
    }
  };

  // 📋 READ ALL (sin paginación)
  getAll = async (req: Request, res: Response) => {
    try {
      const users = await this.userService.getAll();
      return res.status(200).json(users);
    } catch (error: any) {
      console.error("❌ Error fetching users:", error);
      return res.status(500).json({
        message: "Error fetching users",
        details: error.message,
      });
    }
  };

  // 🔍 READ BY ID
  getById = async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await this.userService.getById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error: any) {
      console.error("❌ Error fetching user:", error);
      return res.status(500).json({
        message: "Error fetching user",
        details: error.message,
      });
    }
  };

  // ✏️ UPDATE
  update = async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const updatedUser = await this.userService.update(
        userId,
        req.body as UpdateUserPayload
      );

      return res.status(200).json(updatedUser);
    } catch (error: any) {
      console.error("❌ Error updating user:", error);
      return res.status(500).json({
        message: "Error updating user",
        details: error.message,
      });
    }
  };

  // ❌ DELETE
  delete = async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const deletedUser = await this.userService.delete(userId);

      return res.status(200).json(deletedUser);
    } catch (error: any) {
      console.error("❌ Error deleting user:", error);
      return res.status(500).json({
        message: "Error deleting user",
        details: error.message,
      });
    }
  };

  // 📄 GET ALL PAGINATED
  getAllPaginated = async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "10", role = "all" } = req.query;

      const data = await this.userService.getAllPaginated({
        page: Number(page),
        limit: Number(limit),
        role: String(role),
      });

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("❌ Error fetching paginated users:", error);
      return res.status(500).json({
        message: "Error fetching paginated users",
        details: error.message,
      });
    }
  };
}