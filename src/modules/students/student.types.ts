export interface CreateStudentPayload {
  firstname: string
  lastname: string
  birthdate: Date | string  // 👈 acepta string o Date
  userId?: number           // 👈 opcional ahora
  academyId: number
  beltId: number
}

export interface UpdateStudentPayload {
  firstname?: string
  lastname?: string
  birthdate?: Date | string
  userId?: number
  academyId?: number
  beltId?: number
}