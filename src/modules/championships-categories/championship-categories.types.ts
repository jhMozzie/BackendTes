// src/modules/championship-categories/championship-categories.types.ts

export interface CreateChampionshipCategoryPayload {
  modality: 'KATA' | 'KUMITE';
  ageRange: string;
  ageCategory: string; // <-- LA LÍNEA QUE FALTABA
  gender: 'FEMENINO' | 'MASCULINO' | 'MIXTO';
  skillLevel: string;
  code: string;
}