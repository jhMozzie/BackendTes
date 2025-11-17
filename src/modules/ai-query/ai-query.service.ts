import OpenAI from "openai";
import { PrismaClient } from "../../generated/prisma"; // ✅ Ruta correcta
import type {
  ConvertToSQLResponse,
  ExecuteSQLResponse,
  QuickActionResponse,
  QueryResult,
  AutoQueryResponse,
} from "./ai-query.types";

// ============================================
// INICIALIZACIÓN
// ============================================

const prisma = new PrismaClient();

// Inicializar cliente de OpenAI con la API key del .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// SCHEMA DE LA BASE DE DATOS
// ============================================

const DB_SCHEMA = `
SISTEMA DE GESTIÓN DE KARATE - POSTGRESQL

📊 TABLAS Y COLUMNAS:

1. Championship (Campeonatos)
   - id, name, startDate, location, district, province, country
   - description, image, status, referees, tatamis, academyId

2. ChampionshipCategory (Categorías)
   - id, code, modality (Kata/Kumite), gender, weight
   - beltMinId, beltMaxId, ageRangeId, championshipId

3. Academy (Academias)
   - id, name, userId

4. Student (Estudiantes)
   - id, firstname, lastname, birthdate, beltId, academyId

5. Belt (Cinturones)
   - id, name (Blanco/Amarillo/Verde/Azul/Marrón/Negro), kyuLevel

6. AgeRange (Rangos de Edad)
   - id, label ("8-9 años"), minAge, maxAge

7. Participant (Participantes)
   - id, studentId, championshipCategoryId

8. Match (Combates)
   - id, championshipCategoryId, phaseId, matchNumber
   - winnerId, participantAkkaId, participantAoId
   - scoreAkka, scoreAo, status

9. Phase (Fases)
   - id, description ("Octavos", "Cuartos", etc.), order

10. User (Usuarios)
    - id, email, username, status, roleId

CÓMO OBTENER EL CAMPEÓN (GANADOR) DE UNA CATEGORÍA:
  - Para obtener el ganador de una categoría (primer puesto), busca el match de esa categoría cuyo \`phase.order\` sea máximo (final) y que tenga \`status = 'Completado'\` y \`winnerId IS NOT NULL\`.
  - Ejemplo (si se recibe el código de categoría \`KF-BAS\`):
    SELECT p_winner."studentId" as studentId, s.firstname, s.lastname, a.name as academy
    FROM "Match" m
    JOIN "Phase" ph ON m."phaseId" = ph.id
    JOIN "Participant" p_winner ON m."winnerId" = p_winner.id
    JOIN "Student" s ON p_winner."studentId" = s.id
    JOIN "Academy" a ON s."academyId" = a.id
    JOIN "ChampionshipCategory" cc ON m."championshipCategoryId" = cc.id
    WHERE cc.code = 'KF-BAS' AND m.status = 'Completado'
      AND ph."order" = (
        SELECT MAX(ph2."order") FROM "Phase" ph2
      )
    LIMIT 1;

⚠️ IMPORTANTE: Las tablas en PostgreSQL usan PascalCase con comillas:
SELECT * FROM "Championship" WHERE status = 'En Curso';
SELECT * FROM "Student" s JOIN "Belt" b ON s."beltId" = b.id;

📝 EJEMPLOS:
Usuario: "campeonatos en curso"
SQL: SELECT * FROM "Championship" WHERE status = 'En Curso' ORDER BY "startDate" DESC LIMIT 50;

Usuario: "estudiantes con cinturón negro"
SQL: SELECT s.firstname, s.lastname, a.name as academia FROM "Student" s JOIN "Belt" b ON s."beltId" = b.id JOIN "Academy" a ON s."academyId" = a.id WHERE b.name = 'Negro' LIMIT 50;
`;

// ============================================
// CLASE PRINCIPAL DEL SERVICIO
// ============================================

export class AIQueryService {
  // Cache: null = unknown, true = available, false = not available
  private hasUnaccent: boolean | null = null;

  /**
   * Comprueba si la extensión unaccent está instalada en la base de datos.
   * Resultado cached en `hasUnaccent`.
   */
  private async ensureUnaccentChecked() {
    if (this.hasUnaccent !== null) return;
    try {
      // SELECT EXISTS(...) devuelve una fila con key 'exists' o 'present' dependiendo del driver
      const rows: any = await prisma.$queryRawUnsafe("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'unaccent') as present;");
      if (Array.isArray(rows) && rows.length > 0) {
        const val = rows[0].present ?? Object.values(rows[0])[0];
        this.hasUnaccent = Boolean(val);
      } else if (rows && typeof rows.present !== 'undefined') {
        this.hasUnaccent = Boolean(rows.present);
      } else {
        this.hasUnaccent = false;
      }
    } catch (e) {
      console.warn('⚠️ No se pudo comprobar ext unaccent, se asumirá no disponible:', String(e));
      this.hasUnaccent = false;
    }
  }
  /**
   * Convierte recursivamente valores BigInt a string para que JSON.stringify
   * no falle cuando se devuelven los resultados al cliente.
   */
  private sanitizeRow(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "bigint") {
      // Si el BigInt está dentro del rango seguro de Number, conviértelo a number.
      // De lo contrario devolver como string para no perder precisión.
      const b = obj as bigint;
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
      return b <= maxSafe && b >= minSafe ? Number(b) : b.toString();
    }
    if (Array.isArray(obj)) return obj.map((v) => this.sanitizeRow(v));
    if (typeof obj === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = this.sanitizeRow(v);
      }
      return out;
    }
    return obj;
  }

  async convertToSQL(naturalQuery: string): Promise<ConvertToSQLResponse> {
    try {
      await this.ensureUnaccentChecked();
      const unaccentNote = this.hasUnaccent
        ? "La base de datos tiene la extensión `unaccent`. Para búsquedas textuales donde pueda haber tildes/acentos, genera consultas usando `unaccent(column) ILIKE unaccent('%term%')`."
        : "La base de datos puede no tener la extensión `unaccent`. En ese caso, usa `ILIKE '%term%'` para búsquedas case-insensitive. Si generas `unaccent(...)` y la BD no lo soporta, el servidor hará un intento de fallback.";

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `Eres un experto en PostgreSQL especializado en sistemas deportivos de karate.

${DB_SCHEMA}

🎯 REGLAS OBLIGATORIAS:

1. FORMATO:
   - Genera ÚNICAMENTE código SQL válido
   - NO incluyas explicaciones, comentarios ni markdown
   - NO uses backticks (\`\`\`sql)
   - El SQL debe terminar con punto y coma (;)

2. NOMBRES DE TABLAS:
   - USA SIEMPRE comillas dobles: "Championship", "Student", "Academy"
   - Los nombres de tablas están en PascalCase
   - Ejemplo correcto: SELECT * FROM "Championship"
   - Ejemplo incorrecto: SELECT * FROM Championship (sin comillas)
   - Para columnas compuestas: "startDate", "beltId", "academyId"

3. SEGURIDAD:
   - USA SOLO consultas SELECT
   - PROHIBIDO: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE

4. MEJORES PRÁCTICAS:
  - Usa JOINs cuando necesites información de múltiples tablas
  - Usa alias descriptivos (s para Student, a para Academy, etc.)
  - Ordena resultados con ORDER BY cuando sea lógico
  - Agrega LIMIT 50 por defecto si no se especifica cantidad
  - Usa ILIKE para búsquedas case-insensitive
  - Para búsquedas de texto donde puede haber tildes/acentos (ej. Jiménez vs Jimenez), prefiere usar \`unaccent(...) ILIKE unaccent('%term%')\` para hacer la búsqueda accent-insensitive. Si la extensión \`unaccent\` no está disponible, usa \`ILIKE\` como fallback.

5. FECHAS Y TIEMPO:
   - "hoy", "actual" → CURRENT_DATE o NOW()
   - "futuro", "próximo" → WHERE fecha > CURRENT_DATE
   - "pasado" → WHERE fecha < CURRENT_DATE

📌 EJEMPLO:
Usuario: "Muestra los campeonatos en curso de este año"
SQL: SELECT id, name, location, "startDate" FROM "Championship" WHERE status = 'En Curso' AND EXTRACT(YEAR FROM "startDate") = EXTRACT(YEAR FROM CURRENT_DATE) ORDER BY "startDate" ASC LIMIT 50;`,
          },
          {
            role: "system",
            content: unaccentNote,
          },
          {
            role: "user",
            content: naturalQuery,
          },
        ],
      });

      let sqlGenerated = completion.choices[0]?.message?.content?.trim() || "";

      sqlGenerated = sqlGenerated
        .replace(/```sql/gi, "")
        .replace(/```/g, "")
        .trim();

      const sqlUpper = sqlGenerated.toUpperCase();

      const dangerousKeywords = [
        "DROP",
        "DELETE",
        "UPDATE",
        "INSERT",
        "ALTER",
        "TRUNCATE",
        "CREATE",
        "GRANT",
        "REVOKE",
      ];

      for (const keyword of dangerousKeywords) {
        if (sqlUpper.includes(keyword)) {
          throw new Error(
            `❌ Operación no permitida: ${keyword}. Solo se permiten consultas SELECT por seguridad.`
          );
        }
      }

      if (!sqlUpper.startsWith("SELECT")) {
        throw new Error(
          "❌ Solo se permiten consultas SELECT. Por favor, reformula tu consulta."
        );
      }

      return {
        sql: sqlGenerated,
        naturalQuery,
      };
    } catch (error) {
      console.error("❌ Error en convertToSQL:", error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error(
            "API Key de OpenAI inválida. Verifica tu archivo .env"
          );
        }
        if (error.status === 429) {
          throw new Error(
            "Límite de cuota de OpenAI excedido. Verifica tu plan"
          );
        }
        if (error.status === 500) {
          throw new Error(
            "OpenAI está experimentando problemas. Intenta de nuevo"
          );
        }
      }

      throw new Error(
        error instanceof Error
          ? error.message
          : "Error desconocido al generar la consulta SQL"
      );
    }
  }

  async executeSQL(sql: string): Promise<ExecuteSQLResponse> {
    try {
      const sqlUpper = sql.trim().toUpperCase();

      if (!sqlUpper.startsWith("SELECT")) {
        throw new Error("❌ Solo se permiten consultas SELECT");
      }

      // ✅ Corregido: usar 'as' en vez de genéricos
      const result = (await prisma.$queryRawUnsafe(sql)) as QueryResult[];

      // Sanitizar posibles BigInt presentes en las filas (ids, counts, etc.)
      const sanitized = result.map((r) => this.sanitizeRow(r) as QueryResult);

      return {
        success: true,
        data: sanitized,
        rowCount: sanitized.length,
      };
    } catch (error) {
      console.error("❌ Error al ejecutar SQL:", error);

      // Si el error indica que la función `unaccent` no existe, intentar un fallback
      if (error instanceof Error) {
        const msg = (error as Error).message || "";
        const pgError = error as { code?: string };

        if (msg.toLowerCase().includes("unaccent") && sql.includes("unaccent(")) {
          try {
            // Intentar ejecutar una versión sin la función unaccent reemplazando unaccent(x) por x
            const sanitizedSql = sql.replace(/unaccent\(([^)]+)\)/gi, "$1");
            const retryResult = (await prisma.$queryRawUnsafe(sanitizedSql)) as QueryResult[];
            const sanitized = retryResult.map((r) => this.sanitizeRow(r) as QueryResult);
            return {
              success: true,
              data: sanitized,
              rowCount: sanitized.length,
            };
          } catch (retryErr) {
            console.error("❌ Retry sin unaccent falló:", retryErr);
            // proceder a manejar el error abajo
          }
        }

        if (pgError.code === "42P01") {
          throw new Error(
            "Tabla no encontrada. Verifica el nombre de la tabla."
          );
        }
        if (pgError.code === "42703") {
          throw new Error(
            "Columna no encontrada. Verifica los nombres de las columnas."
          );
        }
        if (pgError.code === "42601") {
          throw new Error("Error de sintaxis en la consulta SQL.");
        }
      }

      throw new Error(
        error instanceof Error
          ? `Error en la consulta: ${error.message}`
          : "Error desconocido al ejecutar la consulta"
      );
    }
  }

  async handleQuickAction(actionId: string): Promise<QuickActionResponse> {
    const actionQueries: Record<string, string> = {
      "active-championships":
        "Muestra todos los campeonatos en curso con ubicación y fechas",
      "medal-table":
        "Genera un medallero con los 10 estudiantes con más victorias",
      "search-competitors":
        "Lista todos los estudiantes con su academia y cinturón",
      "upcoming-tournaments":
        "Muestra campeonatos cuya fecha de inicio sea futura",
    };

    if (actionId === "help") {
      return {
  type: "help",
  content: `💡 **Comandos disponibles:**

📋 Campeonatos: "campeonatos en curso", "torneos de este mes"
🥋 Estudiantes: "estudiantes con cinturón negro", "competidores menores de 18"
🏆 Resultados: "medallero general", "victorias de Juan Pérez"
🏛️ Academias: "lista de academias", "academia con más estudiantes"

Escribe cualquier consulta en lenguaje natural. 🚀`,
      };
    }

    const naturalQuery = actionQueries[actionId];

    if (!naturalQuery) {
      throw new Error(`Acción "${actionId}" no reconocida`);
    }

    // ✅ USAR convertAndExecute en lugar de hacer los pasos por separado
    const result = await this.convertAndExecute(naturalQuery);

    return {
      type: "query",
      interpretation: result.interpretation,  // ← incluir interpretación
      sql: result.sql,
      data: result.data,
    };
  }

  async convertAndExecute(naturalQuery: string): Promise<AutoQueryResponse> {
    const startTime = Date.now();

    try {
      // PASO 1: Generar SQL usando OpenAI
      const { sql } = await this.convertToSQL(naturalQuery);

      // PASO 2: Ejecutar el SQL generado
      const result = await this.executeSQL(sql);

      const executionTime = Date.now() - startTime;

      // PASO 3: Interpretar resultados en lenguaje natural (resumen)
      const interpretation = await this.interpretResults(naturalQuery, sql, result.data);

      // PASO 4: Retornar todo junto
      return {
        sql,
        naturalQuery,
        data: result.data,
        rowCount: result.rowCount,
        executionTime, // Tiempo total en milisegundos
        interpretation,
      };
    } catch (error) {
      console.error("❌ Error en convertAndExecute:", error);
      throw error; // Re-lanzar el error para que lo maneje el controlador
    }
  }

  /**
 * Interpreta los resultados de la consulta SQL en lenguaje natural
 */
private async interpretResults(
  naturalQuery: string,
  sql: string,
  data: QueryResult[]
): Promise<string> {
  try {
    // Si no hay datos, respuesta corta
    if (!data || data.length === 0) {
      return `No encontré resultados para "${naturalQuery}". Intenta reformular tu consulta.`;
    }

    // Preparar un resumen de los datos (máximo 5 filas para el contexto)
    const dataSample = data.slice(0, 5);
    const dataPreview = JSON.stringify(dataSample, null, 2);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente amigable de un sistema de gestión de karate.

Tu trabajo es interpretar los resultados de consultas SQL y explicarlos en lenguaje natural, claro y conciso.

REGLAS:
- Sé breve y directo (máximo 3-4 líneas)
- Usa emojis relevantes (🏆 para campeonatos, 🥋 para estudiantes, 🏛️ para academias)
- Si hay muchos resultados, menciona cuántos son en total
- Enfócate en la información más relevante
- NO menciones SQL ni términos técnicos
- Usa un tono amigable y profesional

EJEMPLOS:
Query: "campeonatos en curso"
Respuesta: "🏆 Encontré 3 campeonatos en curso: 'Copa Nacional' en Lima, 'Torneo Regional' en Arequipa y 'Campeonato Juvenil' en Cusco."

Query: "estudiantes con cinturón negro"
Respuesta: "🥋 Hay 12 estudiantes con cinturón negro distribuidos en 4 academias. Los más destacados son de la academia 'Dojo Central'."`,
        },
        {
          role: 'user',
          content: `Consulta del usuario: "${naturalQuery}"

SQL ejecutado: ${sql}

Resultados obtenidos (${data.length} total, mostrando primeros 5):
${dataPreview}

Por favor, interpreta estos resultados de forma amigable.`,
        },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || 
           `Encontré ${data.length} resultado(s) para tu consulta.`;

  } catch (error) {
    console.error('❌ Error al interpretar resultados:', error);
    // Si falla la interpretación, devolver respuesta genérica
    return `Encontré ${data.length} resultado(s) para tu consulta "${naturalQuery}".`;
  }
}
}
