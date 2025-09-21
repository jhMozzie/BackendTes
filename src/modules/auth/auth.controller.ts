import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginPayload } from "./auth.types";

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const payload = req.body as LoginPayload;
      const result = await authService.login(payload);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ message: error.message || "Unauthorized" });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const result = await authService.logout();
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ message: "Error during logout" });
    }
  }
}