import { Request, Response } from 'express';
import { MatchService } from './match.service';
// 💥 Importar los payloads necesarios
import type { GenerateBracketsPayload, UpdateMatchWinnerPayload, UpdateMatchScorePayload } from './match.types';
// 💥 Importar Prisma para manejo de errores
import { Prisma } from '@/generated/prisma';

export class MatchController {
    private matchService = new MatchService();

    /**
     * POST /matches/generate/:championshipId (Dispara la generación masiva)
     */
    generateBrackets = async (req: Request, res: Response) => {
        try {
            const championshipId = parseInt(req.params.championshipId, 10);
            
            if (isNaN(championshipId)) {
                return res.status(400).json({ message: "ID de campeonato inválido." });
            }

            const payload: GenerateBracketsPayload = {
                championshipId: championshipId
            };
            
            const result = await this.matchService.generateBrackets(payload);
            
            return res.status(201).json(result); 
        } catch (error: any) {
            console.error("❌ Error generating brackets:", error);
            return res.status(500).json({ 
                message: "Error al generar brackets.",
                details: error.message 
            });
        }
    };
    
    /**
     * GET /matches/:championshipCategoryId (Obtiene la llave)
     */
    getBrackets = async (req: Request, res: Response) => {
        try {
            const championshipCategoryId = parseInt(req.params.championshipCategoryId, 10);
            
            if (isNaN(championshipCategoryId)) {
                return res.status(400).json({ message: "ID de categoría inválido." });
            }
            
            const matches = await this.matchService.getBracketsByCategory(championshipCategoryId);
            
            return res.status(200).json(matches);
        } catch (error: any) {
            console.error("❌ Error getting brackets:", error);
            return res.status(500).json({ 
                message: "Error al obtener brackets.",
                details: error.message 
            });
        }
    }
    
    /**
     * 💥 MÉTODO IMPLEMENTADO: Actualiza el ganador y puntaje de un combate
     * PUT /matches/:matchId/winner
     */
    updateMatchWinner = async (req: Request, res: Response) => {
        try {
            const matchId = parseInt(req.params.matchId, 10);
            const payload = req.body as UpdateMatchWinnerPayload;

            if (isNaN(matchId)) {
                return res.status(400).json({ message: "ID de combate inválido." });
            }
            
            if (!payload.winnerId) {
                return res.status(400).json({ message: "Se requiere el ID del ganador (winnerId)." });
            }

            const updatedMatch = await this.matchService.updateMatchWinner(matchId, payload);
            
            return res.status(200).json(updatedMatch);
            
        } catch (error: any) {
             console.error("❌ Error updating match winner:", error);
             // Manejar error si el match no se encuentra (P2025)
             if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                 return res.status(404).json({ 
                    message: "Combate no encontrado.",
                    details: error.message 
                });
             }
             return res.status(500).json({ 
                message: "Error al actualizar el combate.",
                details: error.message 
            });
        }
    }

    /**
     * PUT /matches/:matchId/score
     * Actualiza el marcador y determina automáticamente el ganador
     */
    updateMatchScore = async (req: Request, res: Response) => {
        try {
            const matchId = parseInt(req.params.matchId, 10);
            const payload = req.body as UpdateMatchScorePayload;

            if (isNaN(matchId)) {
                return res.status(400).json({ message: "ID de combate inválido." });
            }
            
            if (payload.scoreAkka === undefined || payload.scoreAo === undefined) {
                return res.status(400).json({ message: "Se requieren ambos scores (scoreAkka y scoreAo)." });
            }

            const updatedMatch = await this.matchService.updateMatchScore(
                matchId, 
                payload.scoreAkka, 
                payload.scoreAo
            );
            
            return res.status(200).json(updatedMatch);
            
        } catch (error: any) {
             console.error("❌ Error updating match score:", error);
             if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                 return res.status(404).json({ 
                    message: "Combate no encontrado.",
                    details: error.message 
                });
             }
             return res.status(500).json({ 
                message: "Error al actualizar el marcador.",
                details: error.message 
            });
        }
    }
}