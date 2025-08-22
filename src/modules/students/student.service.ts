import { PrismaClient } from "@/generated/prisma";
import { CreateStudentPayload, UpdateStudentPayload } from "./student.types";

const prisma = new PrismaClient();

export class StudentService{
    // CREATE
    async create(studentData: CreateStudentPayload){
        const newStudent = await prisma.student.create({
            data:{
                ...studentData,
                birthdate: new Date(studentData.birthdate),
            }
        })
        return newStudent;
    }

    // READ (All)
    async getAll(){
        return prisma.student.findMany({
            include:{
                user: true,
                academy: true,
            }
        });
    }

    // READ(By ID)
    async getById(id: number){
        return prisma.student.findUnique({
            where: {id},
            include: {
                user: true,
                academy: true,
            }
        })
    }

    // UPDATE
    async update(id: number, data:UpdateStudentPayload){
        return prisma.student.update({
            where: {id},
            data: {
                ...data,
                birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
            }
        })
    }

    // DELETE
    async delete(id: number){
        return prisma.student.delete({where: {id}});
    }
    
}
