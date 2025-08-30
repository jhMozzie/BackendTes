// src/modules/students/student.service.ts

// --- 1. IMPORTA 'Prisma' junto con el cliente ---
import { PrismaClient, Prisma } from "@/generated/prisma";
import { CreateStudentPayload, UpdateStudentPayload } from "./student.types";

const prisma = new PrismaClient();

export class StudentService {
    // CREATE (sin cambios)
    async create(studentData: CreateStudentPayload) {
        const newStudent = await prisma.student.create({
            data: {
                ...studentData,
                birthdate: new Date(studentData.birthdate),
            }
        })
        return newStudent;
    }


    async getAll(filters: { academyId?: number } = {}) {
        const whereClause: Prisma.StudentWhereInput = {};

        // ESTA LÓGICA ES LA CLAVE
        if (filters.academyId) {
            whereClause.academyId = filters.academyId;
        }

        return prisma.student.findMany({
            where: whereClause, // Aquí se aplica el filtro
            include: {
                user: true,
                academy: true,
            }
        });
    }
    // READ(By ID) (sin cambios)
    async getById(id: number) {
        return prisma.student.findUnique({
            where: { id },
            include: {
                user: true,
                academy: true,
            }
        })
    }

    // UPDATE (sin cambios)
    async update(id: number, data: UpdateStudentPayload) {
        return prisma.student.update({
            where: { id },
            data: {
                ...data,
                birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
            }
        })
    }

    // DELETE (sin cambios)
    async delete(id: number) {
        return prisma.student.delete({ where: { id } });
    }
}