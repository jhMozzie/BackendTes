import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipPayload, UpdateChampionshipPayload } from "./championship.types";

const prisma = new PrismaClient();

export class ChampionshipService {
    async create(data: CreateChampionshipPayload) {
        // Separamos los datos del campeonato de las categorías opcionales
        const { categories, ...championshipData } = data;

        return prisma.championship.create({
            data: {
                ...championshipData,
                startDate: new Date(championshipData.startDate),
                // --- SOLUCIÓN ERROR 1 ---
                // El academyId ya viene en 'championshipData'
                
                // Si se enviaron categorías, las creamos en la misma transacción
                categories: {
                    create: categories // 'categories' es el array de CreateChampionshipCategoryPayload
                }
            }
        });
    }

    async getAll() {
        return prisma.championship.findMany({
            // --- SOLUCIÓN ERROR 2 ---
            include: {
                academy: true, // Incluimos la academia relacionada
                categories: {
                    // Anidamos el include para traer los participantes de cada categoría
                    include: {
                        participants: {
                            // Y dentro de participantes, traemos los datos del estudiante
                            include: {
                                student: true
                            }
                        }
                    }
                }
            }
        });
    }

    async getById(id: number) {
        return prisma.championship.findUnique({
            where: { id },
            // --- SOLUCIÓN ERROR 2 (misma lógica que getAll) ---
            include: {
                academy: true,
                categories: {
                    include: {
                        participants: {
                            include: {
                                student: true
                            }
                        }
                    }
                }
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
        // CUIDADO: Prisma por defecto no borrará en cascada.
        // Si un campeonato tiene categorías, esta operación fallará.
        // Primero deberías borrar los participantes y categorías asociadas.
        return prisma.championship.delete({ where: { id } });
    }
}