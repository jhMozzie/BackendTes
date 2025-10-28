// src/modules/phases/phase.routes.ts

import { Router } from 'express';
import { PhaseController } from './phase.controller';

const router = Router();
const controller = new PhaseController();

// Rutas CRUD para fases
router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;