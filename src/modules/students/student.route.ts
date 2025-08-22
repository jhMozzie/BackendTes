import { Router } from 'express';
import { StudentController } from './student.controller';

const router = Router();
const controller = new StudentController();

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;