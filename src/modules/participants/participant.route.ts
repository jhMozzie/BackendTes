import { Router } from 'express';
import { ParticipantController } from './participant.controller';

const router = Router();
const controller = new ParticipantController();

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.delete('/:id', controller.delete);

export default router;