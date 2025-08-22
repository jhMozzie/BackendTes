export interface CreateStudentPayload{
    firstname: string;
    lastname: string;
    birthdate: Date;
    userId: number;
    academyId: number;
}

export interface UpdateStudentPayload{
    firstname?: string;
    lastname?: string;
    birthdate?: Date;
    userId?: number;
    academyId?: number;
}