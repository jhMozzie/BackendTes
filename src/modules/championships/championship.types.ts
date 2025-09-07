// src/modules/championships/championship.types.ts

// Esta interfaz se mantiene igual para el nuevo módulo
export interface CreateChampionshipCategoryPayload {
    modality:    string;
    ageRange:    string;
    ageCategory: string;
    gender:      string;
    skillLevel:  string;
}

// --- CORRECCIÓN AQUÍ ---
// Se elimina la propiedad 'categories'
export interface CreateChampionshipPayload {
    name:        string;
    startDate:   string;
    location:    string;
    academyId:   number;
}

export interface UpdateChampionshipPayload {
    name?:       string;
    startDate?:  string;
    location?:   string;
    academyId?:  number;
}