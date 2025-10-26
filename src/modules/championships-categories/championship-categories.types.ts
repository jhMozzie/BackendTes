/**
 * Payload para crear una nueva categoría de campeonato.
 * Define los campos necesarios según el schema.prisma.
 * 'championshipId' se pasará como parámetro separado en el servicio.
 */
export interface CreateChampionshipCategoryPayload {
  code?: string;      // Opcional (String?)
  modality: string;   // Requerido (String) - Ej: "Kata" o "Kumite"
  gender: string;     // Requerido (String) - Ej: "Masculino" o "Femenino"
  weight?: string | null; // Opcional (String?) - Rango de peso, puede ser null
  beltMinId: number;  // Requerido (Int) - ID de un registro Belt
  beltMaxId: number;  // Requerido (Int) - ID de un registro Belt
  ageRangeId: number; // Requerido (Int) - ID de un registro AgeRange

  // Campos como 'ageCategory' o 'skillLevel' NO existen en tu schema.
  // 'ageRange' (el string) se obtiene a través de la relación ageRangeId.
}

/**
 * Payload para actualizar una categoría.
 * Usa Partial para hacer todos los campos de Create opcionales.
 */
export type UpdateChampionshipCategoryPayload = Partial<CreateChampionshipCategoryPayload>;

// --- NO se definen DTOs aquí ---
// (El mapeo se hará directamente en el servicio)