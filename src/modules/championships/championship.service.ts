import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipPayload, UpdateChampionshipPayload } from "./championship.types";

const prisma = new PrismaClient();

export class ChampionshipService {

    async create(data: CreateChampionshipPayload) {
        // La lógica de categorías ha sido eliminada de aquí
        const { academyId, ...championshipData } = data;

        if (!academyId) {
            throw new Error('El ID de la academia es obligatorio.');
        }

        return prisma.championship.create({
            data: {
                ...championshipData,
                startDate: new Date(championshipData.startDate),
                academy: {
                    connect: {
                        id: academyId
                    }
                },
                // La creación de categorías ya no ocurre aquí
            }
        });
    }

    async getAll() {
        return prisma.championship.findMany({
            include: {
                academy: true,
                // Aún queremos ver las categorías al listar los campeonatos
                categories: true,
            }
        });
    }

    async getById(id: number) {
        return prisma.championship.findUnique({
            where: { id },
            include: {
                academy: true,
                categories: true,
            }
        })
    }

    async update(id: number, data: UpdateChampionshipPayload) {
        const { name, startDate, location, academyId } = data;

        const updateData = {
            name,
            location,
            academyId,
            startDate: startDate ? new Date(startDate) : undefined,
        };

        return prisma.championship.update({
            where: { id },
            data: updateData,
        });
    }
    
    async delete(id: number) {
        // Primero, eliminamos todas las categorías asociadas a este campeonato
        // para evitar errores de restricción de clave foránea.
        await prisma.championshipCategory.deleteMany({
            where: { championshipId: id }
        });

        // Ahora podemos eliminar el campeonato de forma segura.
        return prisma.championship.delete({ where: { id } });
    }
}

