// src/modules/championships/championship.types.ts

export interface CreateChampionshipPayload {
  name: string;
  startDate: string;
  location: string;
  district?: string;
  province?: string;
  country?: string;
  description?: string; // 👈 AÑADIDO (opcional)
  image?: string;
  status?: string;
  academyId: number;
  referees?: number;  // 🧑‍⚖️ Número de árbitros
  tatamis?: number;   // 🥋 Número de tatamis
}

export interface UpdateChampionshipPayload {
  name?: string;
  startDate?: string;
  location?: string;
  district?: string;
  province?: string;
  country?: string;
  description?: string; // 👈 AÑADIDO (opcional)
  image?: string;
  status?: string;
  academyId?: number; // (Este probablemente no debería estar aquí si no permites cambiar la academia organizadora)
  referees?: number;  // 🧑‍⚖️ Número de árbitros
  tatamis?: number;   // 🥋 Número de tatamis
}

// Opcional pero recomendado: Define el tipo de dato que SÍ envías al frontend
// en la respuesta paginada.
export interface ChampionshipPaginatedDto {
    id: number;
    name: string;
    startDate: Date; // O string si lo prefieres formateado
    location: string;
    district: string; // Ya manejas el '—'
    province: string; // Ya manejas el '—'
    country: string;  // Ya manejas el '—'
    description: string; // 👈 AÑADIDO
    image: string;
    status: string;
    academy: string;
    referees: number | null;  // 🧑‍⚖️ Número de árbitros
    tatamis: number | null;   // 🥋 Número de tatamis
}