import { Request, Response } from "express";
import { RoleService } from "./role.service";
import { CreateRolePayload, UpdateRolePayload } from "./role.types";

const roleService = new RoleService();

export class RoleController {
  async create(req: Request, res: Response) {
    try {
      const newRole = await roleService.create(req.body as CreateRolePayload);
      return res.status(201).json(newRole);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error creating role" });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const roles = await roleService.getAll();
      return res.status(200).json(roles);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching roles" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const role = await roleService.getById(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      return res.status(200).json(role);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching role" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updatedRole = await roleService.update(
        id,
        req.body as UpdateRolePayload
      );
      return res.status(200).json(updatedRole);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error updating role" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deletedRole = await roleService.delete(id);
      return res.status(200).json(deletedRole);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error deleting role" });
    }
  }
}