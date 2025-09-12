export interface CreateParticipantPayload {
    studentId: number;
    // CORRECCIÓN: Se debe enviar el ID de la categoría, no del campeonato.
    championshipCategoryId: number;
}
