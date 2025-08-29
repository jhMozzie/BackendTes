import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipPayload, UpdateChampionshipPayload } from "./championship.types";

const prisma = new PrismaClient();

export class ChampionshipService {
    // src/modules/championships/championship.service.ts

// ... (tus imports y la clase)

async create(data: CreateChampionshipPayload) {
    // 1. Separamos academyId del resto de los datos del campeonato
    const { categories, academyId, ...championshipData } = data;

    // 2. Verificamos que el academyId se haya proporcionado (buena práctica)
    if (!academyId) {
        throw new Error('El ID de la academia es obligatorio.');
    }

    return prisma.championship.create({
        data: {
            // 3. Pasamos los datos simples del campeonato (name, location)
            ...championshipData, 
            startDate: new Date(championshipData.startDate),
            
            // 4. AQUÍ ESTÁ LA CORRECCIÓN: Usamos 'connect' para la relación
            academy: {
                connect: {
                    id: academyId
                }
            },
            
            // 5. Tu lógica para crear categorías se mantiene igual
            categories: {
                create: categories
            }
        }
    });
}

// ... (el resto de tus funciones: getAll, getById, etc.)

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