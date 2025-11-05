// src/modules/academies-championships/academy-championships.types.ts

/**
 * Estados posibles de participación de una academia en un campeonato
 */
export enum ParticipationStatus {
  PARTICIPAR = "Participar",           // Estado inicial - Academia muestra interés
  PARTICIPANDO = "Participando",       // Academia confirmó participación (click en botón)
  PRE_INSCRITO = "PreInscrito",       // Academia tiene estudiantes inscritos
  CONFIRMADO = "Confirmado"            // Participación confirmada finalmente
}

/**
 * Payload para crear una participación
 */
export interface CreateParticipationDto {
  academyId: number;
  championshipId: number;
  status?: ParticipationStatus;
}

/**
 * Payload para actualizar el estado de participación
 */
export interface UpdateParticipationStatusDto {
  status: ParticipationStatus;
}

/**
 * Payload para avanzar al siguiente estado automáticamente
 */
export interface AdvanceStatusDto {
  academyId: number;
  championshipId: number;
}

/**
 * Estructura de respuesta de participación con relaciones
 */
export interface ParticipationResponse {
  id: number;
  academyId: number;
  championshipId: number;
  status: string;
  academy?: {
    id: number;
    name: string;
  };
  championship?: {
    id: number;
    name: string;
    startDate: Date;
  };
}
