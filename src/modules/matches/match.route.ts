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

// 💥 NUEVA RUTA: Actualizar el ganador/score de un combate
// PATCH /api/matches/5/winner (Donde 5 es el ID del Match)
router.patch('/:matchId/winner', controller.updateMatchWinner);

export default router;