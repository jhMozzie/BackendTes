// src/modules/championships/championship.types.ts

export interface CreateChampionshipPayload {
  name: string;
  startDate: string;
  location: string;
  district?: string;
  province?: string;
  country?: string;
  image?: string;
  status?: string;
  academyId: number;
}

export interface UpdateChampionshipPayload {
  name?: string;
  startDate?: string;
  location?: string;
  district?: string;
  province?: string;
  country?: string;
  image?: string;
  status?: string;
  academyId?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}