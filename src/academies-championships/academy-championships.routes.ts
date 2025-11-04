// src/academies-championships/academy-championships.routes.ts

import { Router } from 'express';
import { AcademyChampionshipController } from './academy-championships.controller';

const router = Router();
const controller = new AcademyChampionshipController();

// Crear participación (click en "Participar")
router.post('/', controller.createParticipation);

// Obtener participación específica
router.get('/:academyId/:championshipId', controller.getParticipation);

// Actualizar estado manualmente
router.patch('/:academyId/:championshipId/status', controller.updateStatus);

// Avanzar al siguiente estado automáticamente
router.post('/:academyId/:championshipId/advance', controller.advanceStatus);

// Obtener todas las participaciones de una academia
router.get('/academy/:academyId', controller.getAcademyParticipations);

// Obtener todas las academias participantes de un campeonato
router.get('/championship/:championshipId', controller.getChampionshipParticipations);

// Obtener estadísticas de participación
router.get('/championship/:championshipId/stats', controller.getParticipationStats);

// Cancelar participación
router.delete('/:academyId/:championshipId', controller.deleteParticipation);

export default router;
