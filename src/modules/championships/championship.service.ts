import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipPayload, UpdateChampionshipPayload } from "./championship.types";

const prisma = new PrismaClient();

export class ChampionshipService {
    async create(data: CreateChampionshipPayload) {
        return prisma.championship.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
            }
        });
    }

    async getAll() {
        return prisma.championship.findMany({
            include: {
                categories: true,
                participants: true,
            }
        });
    }

    async getById(id: number) {
        return prisma.championship.findUnique({
            where: { id },
            include: {
                categories: true,
                participants: true,
            }
        })
    }

    // --- FUNCIÓN CORREGIDA ---
    async update(id: number, data: UpdateChampionshipPayload) {
        // Separa los campos que no son relaciones
        const { name, startDate, location } = data;

        // Construye el objeto de datos solo con los campos que quieres actualizar
        const updateData = {
            name,
            location,
            // Convierte la fecha solo si existe
            startDate: startDate ? new Date(startDate) : undefined,
        };

        return prisma.championship.update({
            where: { id },
            data: updateData, // Pasa solo los datos del campeonato
        });
    }
    
    async delete(id: number) {
        return prisma.championship.delete({ where: { id } });
    }
}