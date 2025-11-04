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
 * Incluye información completa de la categoría (especialmente modality: "Kata" o "Kumite")
 */
export interface MatchDetails extends PrismaMatch {
    championshipCategory: {
        id: number;
        code: string | null;
        modality: string;  // ← CRÍTICO: "Kata" o "Kumite"
        gender: string;
        weight: string | null;
        beltMin: { id: number; name: string; kyuLevel: number };
        beltMax: { id: number; name: string; kyuLevel: number };
        ageRange: { id: number; label: string; minAge: number; maxAge: number };
    };
    phase: { description: string; order: number };
    participantAkka: BracketParticipant | null;
    participantAo: BracketParticipant | null;
    winner: { student: { firstname: string; lastname: string } } | null;
}