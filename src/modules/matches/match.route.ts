// src/modules/matches/match.routes.ts

import { Router } from 'express';
import { MatchController } from './match.controller';

const router = Router();
const controller = new MatchController();

// Ruta de generación masiva
// POST /api/matches/generate/1
router.post('/generate/:championshipId', controller.generateBrackets); 

// Ruta para OBTENER los brackets de una categoría
// GET /api/matches/1
router.get('/:championshipCategoryId', controller.getBrackets);

// 💥 RUTA: Actualizar el ganador/score de un combate manualmente
// PUT /api/matches/5/winner (Donde 5 es el ID del Match)
// ⚠️ NOTA: Normalmente usa /score que determina el ganador automáticamente
router.put('/:matchId/winner', controller.updateMatchWinner);

// 🆕 RUTA PRINCIPAL: Actualizar marcador y determinar ganador automáticamente
// PUT /api/matches/5/score
// El ganador se determina por quien tenga el score más alto
router.put('/:matchId/score', controller.updateMatchScore);

export default router;