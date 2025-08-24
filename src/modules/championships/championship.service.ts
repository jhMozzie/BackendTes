import { PrismaClient } from "@/generated/prisma";
import { CreateChampionshipPayload, UpdateChampionshipPayload } from "./championship.types";

const prisma = new PrismaClient();

export class ChampionshipService {
    async create(data: CreateChampionshipPayload){
        return prisma.championship.create({
            data:{
                ...data,
                startDate: new Date(data.startDate),
            }
        });
    }

    async getAll(){
        return prisma.championship.findMany({
            include:{
                categories: true,
                participants: true,
            }
        });
    }

    async getById(id: number){
        return prisma.championship.findUnique({
            where: {id},
            include: {
                categories: true,
                participants: true,
            }
        })
    }

    async update(id: number, data: UpdateChampionshipPayload){
        return prisma.championship.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
            }
        })
    }

    async delete(id: number){
        return prisma.championship.delete({where: {id}});
    }
}