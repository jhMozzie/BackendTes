import { Router } from "express";
import { AcademyController } from "./academy.controller";

const router = Router();
const controller = new AcademyController();

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;
