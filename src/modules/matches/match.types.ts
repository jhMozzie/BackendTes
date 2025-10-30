// src/modules/matches/match.types.ts

import type { Match as PrismaMatch, Participant, Student, Academy } from "@/generated/prisma";

// El participante que se incluye en el bracket
export type BracketParticipant = Participant & {
    student: (Student & { academy: Academy | null }) | null 
};

/**
 * Payload para el endpoint de generación masiva (Recibe el ID del campeonato).
 */
export interface GenerateBracketsPayload {
    championshipId: number;
}

/**
 * Payload para actualizar el ganador de un combate
 */
export interface UpdateMatchWinnerPayload {
    winnerId: number; // Participant ID del ganador
    scoreAkka?: number;
    scoreAo?: number;
}

/**
 * Estructura de salida básica para un Combate/Match (lo que ve el frontend).
 */
export interface MatchDetails extends PrismaMatch {
    phase: { description: string; order: number };
    participantAkka: BracketParticipant | null;
    participantAo: BracketParticipant | null;
    winner: { student: { firstname: string; lastname: string } } | null;
}