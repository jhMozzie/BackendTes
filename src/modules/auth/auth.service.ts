import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginPayload, LoginResponse } from "./auth.types";

const prisma = new PrismaClient();

export class AuthService {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { email, password } = payload;

    // Buscar usuario con su rol y academias
    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        role: true,
        academies: true  // 🆕 Incluir academias del usuario
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, role: user.role.description },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1h" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role.description,
        academyId: user.academies[0]?.id ?? null  // 🆕 Primera academia (o null)
        // Alternativa si necesitas todas las academias:
        // academies: user.academies.map(a => ({ id: a.id, name: a.name }))
      },
    };
  }

  async logout(): Promise<{ message: string }> {
    // En un MVP, el logout solo se maneja en frontend borrando el token.
    // Aquí solo devolvemos confirmación.
    return { message: "Logged out successfully" };
  }
}