// src/modules/championships/championship.types.ts

export interface CreateChampionshipCategoryPayload {
    modality:    string;
    // --- CAMBIO AQUÍ ---
    // Ambos campos son necesarios para crear la categoría
    ageRange:    string;
    ageCategory: string; 
    gender:      string;
    skillLevel:  string;
}

export interface CreateChampionshipPayload {
    name:        string;
    startDate:   string;
    location:    string;
    academyId:   number; 
    categories?: CreateChampionshipCategoryPayload[];
}

export interface UpdateChampionshipPayload {
    name?:       string;
    startDate?:  string;
    location?:   string;
    academyId?:  number;
}