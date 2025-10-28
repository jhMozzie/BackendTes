// src/modules/phases/phase.types.ts

/**
 * Estructura de salida para una Fase del Torneo (Ronda).
 */
export interface Phase {
    id: number;
    description: string; // Ej: "Octavos de Final"
    order: number;       // 1, 2, 3, ... (Para ordenar el bracket)
}

/**
 * Payload para crear una nueva fase.
 */
export interface CreatePhaseDto {
    description: string;
    order: number;
}

/**
 * Payload para actualizar una fase existente.
 */
export interface UpdatePhaseDto {
    description?: string;
    order?: number;
}