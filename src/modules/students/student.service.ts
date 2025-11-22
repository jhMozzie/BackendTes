import { Prisma, PrismaClient, Student } from "@/generated/prisma";
import { paginate } from "@/modules/common/pagination/pagination.helper";
import {
  PaginationParams,
  CreateStudentPayload,
  UpdateStudentPayload,
} from "@/types";

const prisma = new PrismaClient();

export class StudentService {
  // 🏗️ CREATE
  async create(studentData: CreateStudentPayload) {
    const { firstname, lastname, birthdate, userId, academyId, beltId } =
      studentData;

    // Prisma ignora null correctamente si el campo es opcional
    const data: Prisma.StudentUncheckedCreateInput = {
      firstname,
      lastname,
      birthdate: new Date(birthdate),
      beltId,
      academyId,
      userId: userId ?? null,
      gender: "M"
    };

    return prisma.student.create({
      data,
      include: {
        belt: true,
        user: true,
        academy: true,
      },
    });
  }

  // 📋 READ ALL (paginado y filtro opcional)
  async getAllPaginated(params: PaginationParams & { academyId?: number }) {
    const whereClause: Prisma.StudentWhereInput = {};

    if (params.academyId) {
      whereClause.academyId = params.academyId;
    }

    const result = await paginate<
      Student & {
        belt: { id: number; name: string; kyuLevel: number } | null;
        user: { id: number; username: string; email: string } | null;
        academy: { id: number; name: string } | null;
      }
    >(prisma.student, params, {
      where: whereClause,
      include: {
        belt: { select: { id: true, name: true, kyuLevel: true } },
        user: { select: { id: true, username: true, email: true } },
        academy: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    // ✅ Incluimos los id para poder usar en el formulario
    const data = result.data.map((student) => ({
      id: student.id,
      firstname: student.firstname,
      lastname: student.lastname,
      birthdate: student.birthdate,
      belt: student.belt
        ? {
            id: student.belt.id,
            name: student.belt.name,
            kyuLevel: student.belt.kyuLevel,
          }
        : undefined,
      academy: student.academy
        ? { id: student.academy.id, name: student.academy.name }
        : undefined,
      user: student.user
        ? {
            id: student.user.id,
            username: student.user.username,
            email: student.user.email,
          }
        : undefined,
    }));

    return { data, meta: result.meta };
  }

  // 🔍 READ BY ID
  async getById(id: number) {
    return prisma.student.findUnique({
      where: { id },
      include: {
        belt: { select: { id: true, name: true, kyuLevel: true } },
        user: { select: { username: true, email: true } },
        academy: { select: { id: true, name: true } },
      },
    });
  }

  // ✏️ UPDATE
  async update(id: number, data: UpdateStudentPayload) {
    const { firstname, lastname, birthdate, userId, academyId, beltId } = data;

    return prisma.student.update({
      where: { id },
      data: {
        firstname,
        lastname,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        ...(beltId ? { belt: { connect: { id: Number(beltId) } } } : {}),
        ...(academyId
          ? { academy: { connect: { id: Number(academyId) } } }
          : {}),
        ...(userId ? { user: { connect: { id: Number(userId) } } } : {}),
      },
      include: {
        belt: { select: { id: true, name: true, kyuLevel: true } },
        user: { select: { username: true, email: true } },
        academy: { select: { id: true, name: true } },
      },
    });
  }

  // ❌ DELETE
  async delete(id: number) {
    return prisma.student.delete({ where: { id } });
  }
}
