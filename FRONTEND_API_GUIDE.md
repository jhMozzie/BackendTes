# 🔧 Guía de API para el Frontend - Categorías

## ❌ ERROR COMÚN: `ageRangeId` inválido

### Problema
```
Error: El rango de edad con ID 5 no existe en la base de datos.
```

### Causa
El frontend está enviando `ageRangeId: 5` pero **solo existen 4 rangos de edad** en la base de datos:

| ID | Rango de Edad |
|----|---------------|
| 1  | Infantil (6-9 años) |
| 2  | Cadete (10-13 años) |
| 3  | Junior (14-17 años) |
| 4  | Senior (18+ años) |

**⚠️ IMPORTANTE**: No confundir `ageRangeId` con `beltId`. Son tablas diferentes.

---

## ✅ SOLUCIÓN: Endpoint de datos auxiliares

### 🆕 Nuevo Endpoint
```
GET /api/championship-categories/form-data
```

### Respuesta
```json
{
  "ageRanges": [
    {
      "id": 1,
      "label": "Infantil (6-9 años)",
      "minAge": 6,
      "maxAge": 9
    },
    {
      "id": 2,
      "label": "Cadete (10-13 años)",
      "minAge": 10,
      "maxAge": 13
    },
    {
      "id": 3,
      "label": "Junior (14-17 años)",
      "minAge": 14,
      "maxAge": 17
    },
    {
      "id": 4,
      "label": "Senior (18+ años)",
      "minAge": 18,
      "maxAge": 99
    }
  ],
  "belts": [
    { "id": 1, "name": "Blanco 10mo Kyu", "kyuLevel": 10 },
    { "id": 2, "name": "Amarillo 9no Kyu", "kyuLevel": 9 },
    { "id": 3, "name": "Naranja 8vo Kyu", "kyuLevel": 8 },
    { "id": 4, "name": "Naranja Punta Verde 7mo Kyu", "kyuLevel": 7 },
    { "id": 5, "name": "Verde 6to Kyu", "kyuLevel": 6 },
    { "id": 6, "name": "Azul 5to Kyu", "kyuLevel": 5 },
    { "id": 7, "name": "Azul Punta Marrón 4to Kyu", "kyuLevel": 4 },
    { "id": 8, "name": "Marrón 3er Kyu", "kyuLevel": 3 },
    { "id": 9, "name": "Marrón 2do Kyu", "kyuLevel": 2 },
    { "id": 10, "name": "Marrón 1er Kyu", "kyuLevel": 1 },
    { "id": 11, "name": "Negro", "kyuLevel": 0 }
  ],
  "modalities": ["Kata", "Kumite"],
  "genders": ["Masculino", "Femenino"]
}
```

---

## 📝 Ejemplo de uso en Frontend

### 1. Cargar datos al montar el componente

```typescript
// React/Vue/Angular
async function loadFormData() {
  const response = await axios.get('/api/championship-categories/form-data');
  const { ageRanges, belts, modalities, genders } = response.data;
  
  // Guardar en estado para usar en selectores/dropdowns
  setAgeRanges(ageRanges);
  setBelts(belts);
  setModalities(modalities);
  setGenders(genders);
}
```

### 2. Crear categoría con datos correctos

```typescript
// ✅ CORRECTO
const newCategory = {
  code: "KM-SEN-BAS",
  modality: "Kumite",
  gender: "Masculino",
  ageRangeId: 4,        // ✅ Senior (18+ años) - ID correcto
  beltMinId: 1,         // ✅ Blanco 10mo Kyu
  beltMaxId: 3,         // ✅ Naranja 8vo Kyu
  weight: null          // null para Kata, string para Kumite (ej: "-60kg")
};

await axios.post(`/api/championships/${championshipId}/categories`, newCategory);
```

```typescript
// ❌ INCORRECTO
const newCategory = {
  ageRangeId: 5,  // ❌ NO EXISTE - Solo hay 4 rangos (1-4)
  beltMinId: 18,  // ❌ NO EXISTE - Solo hay 11 cinturones (1-11)
  // ...
};
```

---

## 🔍 Validaciones del Backend

### Al crear/editar categorías, el backend valida:

1. ✅ **Rango de edad existe** (`ageRangeId` debe ser 1-4)
2. ✅ **Cinturones existen** (`beltMinId` y `beltMaxId` deben ser 1-11)
3. ✅ **Código único** (opcional, pero si se envía debe ser único en el campeonato)
4. ✅ **Combinación única** (no puede haber dos categorías idénticas)
5. ✅ **Género del estudiante** (al inscribir, valida que coincida con la categoría)
6. ✅ **Rango de cinturón** (al inscribir, valida que el estudiante esté en el rango)

---

## 🐛 Debug: Verificar datos en backend

Si necesitas verificar qué datos existen en tu base de datos:

```bash
# En el backend
cd /path/to/backend
pnpm ts-node check-age-ranges.ts
```

Esto te mostrará todos los rangos de edad y cinturones disponibles.

---

## 📞 Soporte

Si sigues teniendo problemas:
1. Verifica que hayas ejecutado `pnpm seed` en el backend
2. Verifica que el frontend esté haciendo peticiones a la URL correcta
3. Revisa la consola del navegador para ver qué datos está enviando exactamente
4. Usa el endpoint `/form-data` para obtener los IDs correctos dinámicamente
