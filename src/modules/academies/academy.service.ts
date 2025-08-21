import { PrismaClient } from "@/generated/prisma";
import { CreateAcademyPayload, UdpateAcademyPayload } from './academy.types';

const prisma = new PrismaClient();

export class AcademyService{
    // CREATE
    async create(academyData: CreateAcademyPayload){
        const newAcademy = await prisma.academy.create({data: academyData});
        return newAcademy;
    }

    // READ(All)
    async getAll(){
        return prisma.academy.findMany();
    }

    // READ(By ID)
    async getById(id: number){
        return prisma.academy.findUnique({where: {id}});
    }

    // UPDATE
    async update(id: number, data: UdpateAcademyPayload){
        return prisma.academy.update({where: {id}, data});
    }

    // DELETE
    async delete(id: number){
        return prisma.academy.delete({where: {id}});
    }
}