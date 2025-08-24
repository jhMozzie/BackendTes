import { PrismaClient } from "@/generated/prisma";
import { CreateCategoryPayload, UpdateCategoryPayload } from "./category.types";

const prisma = new PrismaClient();

export class CategoryService{
    async create(data: CreateCategoryPayload){
        return prisma.category.create({data});
    }

    async getAll(){
        return prisma.category.findMany();
    }

    async getById(id: number){
        return prisma.category.findUnique({where: {id}});
    }

    async update(id: number, data: UpdateCategoryPayload){
        return prisma.category.update({where: {id}, data});
    }

    async delete(id: number){
        return prisma.category.delete({where: {id}});
    }
}