/**
 * Tipos para el módulo AI Query
 * Sin usar 'any' para mejor type safety
 */

// ============================================
// REQUEST TYPES (Lo que recibe el backend)
// ============================================

export interface ConvertToSQLRequest {
  naturalQuery: string;
}

export interface ExecuteSQLRequest {
  sql: string;
}

export interface QuickActionRequest {
  actionId: 'active-championships' | 'medal-table' | 'search-competitors' | 'upcoming-tournaments' | 'help';
}

// ============================================
// RESPONSE TYPES (Lo que devuelve el backend)
// ============================================

export interface ConvertToSQLResponse {
  sql: string;
  naturalQuery: string;
}

export interface ExecuteSQLResponse {
  success: boolean;
  data: QueryResult[];
  rowCount: number;
}

export interface QuickActionResponse {
  type: 'help' | 'query';
  content?: string;
  interpretation?: string;
  sql?: string;
  data?: QueryResult[];
}

// 🆕 NUEVO: Para el endpoint /auto
export interface AutoQueryRequest {
  naturalQuery: string;
}

// ============================================
// DATABASE TYPES (Resultados de queries)
// ============================================

/**
 * Tipo genérico para resultados de queries SQL
 * Representa una fila de la base de datos como objeto clave-valor
 */
export type QueryResult = Record<string, unknown>;

/**
 * Tipos específicos para tablas conocidas (opcional pero recomendado)
 */
export interface Championship {
  id: number;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  location: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: Date;
}

export interface Student {
  id: number;
  name: string;
  birth_date: Date;
  belt_id: number;
  academy_id: number;
  gender: 'male' | 'female';
  weight: number | null;
}

export interface Academy {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
}

// 🆕 NUEVO: Respuesta del endpoint /auto (combina SQL + datos)
export interface AutoQueryResponse {
  sql: string;
  naturalQuery: string;
  data: QueryResult[];
  rowCount: number;
  executionTime?: number; // Opcional: tiempo de ejecución
  interpretation?: string; // Interpretación en lenguaje natural (opcional)
}

// ============================================
// ERROR TYPES
// ============================================

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}