// src/modules/championships/types/participants.types.ts

// ... (ParticipantListParams, Inscription, ParticipantStudentItem, PaginatedParticipantsResponse sin cambios)

/**
 * Payload para CREAR (inscribir) un participante.
 * Soporta múltiples categorías (lo que el frontend envía).
 */
export interface CreateParticipantPayload {
    studentId: number;
    championshipId: number; 
    categoryIds: number[]; // Permite la creación masiva
}

/**
 * Payload para ACTUALIZAR una inscripción individual.
 * Solo se usa para cambiar la categoría de un registro existente.
 */
export interface UpdateParticipantPayload {
    championshipCategoryId: number; // El ID de la nueva categoría
}

/**
 * Parámetros de filtrado para obtener participantes paginados
 */
export interface ParticipantFilterParams {
    page: number;
    limit: number;
    championshipId?: number;
    categoryId?: number;
    studentId?: number;
    academyId?: number; // 🆕 Filtrar por academia (para entrenadores)
}
