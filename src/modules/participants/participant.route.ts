import { Router } from 'express';
import { ParticipantController } from './participant.controller';

const router = Router();
const controller = new ParticipantController();

// 1. POST /participants (Crea una inscripción)
router.post('/', controller.create);

// 2. GET /participants?page=... (Lista PAGINADA con filtros)
//    NOTA: También maneja GET /participants (lista simple/no paginada si no se pasan params)
router.get('/', controller.getAll);

// 3. GET /participants/:id (Obtiene uno)
router.get('/:id', controller.getById);

// 4. DELETE /participants/:id (Elimina)
router.delete('/:id', controller.delete);

export default router;