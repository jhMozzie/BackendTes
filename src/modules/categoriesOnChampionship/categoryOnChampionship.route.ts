import { Router } from 'express';
import { CategoriesOnChampionshipsController } from './categoryOnChampionship.controller';

const router = Router();
const controller = new CategoriesOnChampionshipsController();

router.post('/', controller.addCategory);
router.delete('/:championshipId/:categoryId', controller.removeCategory);

export default router;