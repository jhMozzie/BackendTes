import { Router } from 'express';
import { AIQueryController } from './ai-query.controller';

const router = Router();
const controller = new AIQueryController();

/**
 * @route   POST /api/ai-query/convert
 * @desc    Convierte lenguaje natural a SQL (sin ejecutar)
 */
router.post('/convert', controller.convertToSQL);

/**
 * @route   POST /api/ai-query/execute
 * @desc    Ejecuta SQL ya generado
 */
router.post('/execute', controller.executeSQL);

/**
 * @route   POST /api/ai-query/auto
 * @desc    Convierte y ejecuta automáticamente (1 solo paso)
 * @new     🆕 NUEVO ENDPOINT
 */
router.post('/auto', controller.convertAndExecute);

/**
 * @route   POST /api/ai-query/quick-action
 * @desc    Ejecuta acción rápida predefinida
 */
router.post('/quick-action', controller.quickAction);

export default router;