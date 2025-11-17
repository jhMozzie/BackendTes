import { Request, Response } from 'express';
import { AIQueryService } from './ai-query.service';
import type { 
  ConvertToSQLRequest,
  ExecuteSQLRequest,
  QuickActionRequest,
  ErrorResponse, 
  AutoQueryRequest
} from './ai-query.types';

export class AIQueryController {
  private aiQueryService: AIQueryService;

  constructor() {
    this.aiQueryService = new AIQueryService();
  }

  /**
   * POST /api/ai-query/convert
   * Convierte texto natural a SQL
   */
  convertToSQL = async (
    req: Request<{}, {}, ConvertToSQLRequest>, 
    res: Response
  ): Promise<Response> => {
    try {
      const { naturalQuery } = req.body;

      // Validaciones
      if (!naturalQuery || typeof naturalQuery !== 'string') {
        return res.status(400).json({
          error: 'Se requiere el campo "naturalQuery" (string)',
        } as ErrorResponse);
      }

      if (naturalQuery.trim().length < 3) {
        return res.status(400).json({
          error: 'La consulta debe tener al menos 3 caracteres',
        } as ErrorResponse);
      }

      // Procesar
      const result = await this.aiQueryService.convertToSQL(naturalQuery);
      return res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en convertToSQL:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al procesar la consulta',
      } as ErrorResponse);
    }
  };

  /**
   * POST /api/ai-query/execute
   * Ejecuta SQL generado
   */
  executeSQL = async (
    req: Request<{}, {}, ExecuteSQLRequest>, 
    res: Response
  ): Promise<Response> => {
    try {
      const { sql } = req.body;

      if (!sql || typeof sql !== 'string') {
        return res.status(400).json({
          error: 'Se requiere el campo "sql" (string)',
        } as ErrorResponse);
      }

      const result = await this.aiQueryService.executeSQL(sql);
      return res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en executeSQL:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al ejecutar la consulta',
      } as ErrorResponse);
    }
  };

  /**
   * POST /api/ai-query/quick-action
   * Ejecuta acción rápida
   */
  quickAction = async (
    req: Request<{}, {}, QuickActionRequest>, 
    res: Response
  ): Promise<Response> => {
    try {
      const { actionId } = req.body;

      if (!actionId || typeof actionId !== 'string') {
        return res.status(400).json({
          error: 'Se requiere el campo "actionId" (string)',
        } as ErrorResponse);
      }

      const result = await this.aiQueryService.handleQuickAction(actionId);
      return res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error en quickAction:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al procesar la acción',
      } as ErrorResponse);
    }
  };

  /**
 * POST /api/ai-query/auto
 * Convierte lenguaje natural a SQL y lo ejecuta automáticamente
 * 
 * Este endpoint combina /convert + /execute en un solo paso
 * Útil para experiencia de usuario rápida
 */
convertAndExecute = async (
  req: Request<{}, {}, AutoQueryRequest>, 
  res: Response
): Promise<Response> => {
  try {
    const { naturalQuery } = req.body;

    // Validaciones
    if (!naturalQuery || typeof naturalQuery !== 'string') {
      return res.status(400).json({
        error: 'Se requiere el campo "naturalQuery" (string)',
      } as ErrorResponse);
    }

    if (naturalQuery.trim().length < 3) {
      return res.status(400).json({
        error: 'La consulta debe tener al menos 3 caracteres',
      } as ErrorResponse);
    }

    // Procesar: Generar SQL + Ejecutar
    const result = await this.aiQueryService.convertAndExecute(naturalQuery);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error en convertAndExecute:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al procesar la consulta',
    } as ErrorResponse);
  }
};
}