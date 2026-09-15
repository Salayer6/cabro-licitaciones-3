/**
 * mercadoPublicoService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio para consumir la API REST oficial de Mercado Público (ChileCompra).
 * Documentación oficial: https://api.mercadopublico.cl/
 *
 * AUTENTICACIÓN:
 *   Todos los endpoints requieren el parámetro `ticket` en el query string.
 *   Obtén tu ticket registrándote en: https://api.mercadopublico.cl/
 *   Configura el ticket via variable de entorno MERCADO_PUBLICO_TICKET en el
 *   archivo .env de la raíz del backend.
 *
 * USO:
 *   const service = require('./mercadoPublicoService');
 *   const hoy = await service.getLicitacionesHoy();
 *   const licitacion = await service.getLicitacionById('1234-56-LQ23');
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const axios = require('axios');

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN BASE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * URL base de la API oficial de Mercado Público.
 * Todos los endpoints se construyen a partir de esta raíz.
 */
const API_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico';

/**
 * Ticket de acceso obligatorio para autenticarse en la API.
 * Se lee desde la variable de entorno MERCADO_PUBLICO_TICKET.
 * NUNCA incluyas el ticket directamente en el código fuente.
 */
const TICKET = process.env.MERCADO_PUBLICO_TICKET || '';

/**
 * Timeout en milisegundos para cada petición HTTP.
 * Ajusta según el SLA de tu aplicación (recomendado: 10-15 s).
 */
const REQUEST_TIMEOUT_MS = 12000;

// ──────────────────────────────────────────────────────────────────────────────
// INSTANCIA AXIOS COMPARTIDA
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Cliente HTTP preconfigurado con la URL base, timeout y cabeceras comunes.
 * Reutilizar esta instancia en lugar de llamar axios directamente permite
 * aplicar interceptores de forma centralizada en el futuro.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// TIPADO / INTERFACES (JSDoc)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LicitacionResumen
 * @property {string} CodigoLicitacion    - ID único de la licitación (ej: "1234-56-LQ23")
 * @property {string} Nombre              - Nombre o descripción de la licitación
 * @property {string} CodigoEstado        - Código del estado actual (ej: "5" = Publicada)
 * @property {string} Organismo           - Nombre del organismo comprador
 * @property {string} FechaCierre         - Fecha/hora de cierre en ISO 8601
 * @property {string} FechaPublicacion    - Fecha/hora de publicación en ISO 8601
 * @property {string|null} MontoPesos     - Monto estimado en CLP (puede ser null)
 * @property {string} Tipo                - Tipo de licitación (ej: "LS1", "LP", etc.)
 */

/**
 * @typedef {Object} LicitacionDetalle
 * Incluye todos los campos de LicitacionResumen más:
 * @property {string} Descripcion         - Descripción larga de la licitación
 * @property {string} CodigoRegion        - Código de la región del organismo
 * @property {string} NombreRegion        - Nombre de la región
 * @property {string} ResponsableContrato - Nombre del responsable del contrato
 * @property {Array}  Items               - Arreglo de ítems requeridos
 */

/**
 * @typedef {Object} RespuestaListado
 * @property {number}              Cantidad  - Número total de registros en `Listado`
 * @property {LicitacionResumen[]} Listado   - Arreglo con las licitaciones encontradas
 */

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS PRIVADOS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha JavaScript al string requerido por la API: "DDMMAAAA".
 * ⚠️  La API de Mercado Público NO usa AAAAMMDD — usa DDMMAAAA.
 * Ejemplo: new Date('2026-07-06') → "06072026"
 *
 * @param {Date} date
 * @returns {string}
 */
function formatFechaAPI(date) {
  const anio = date.getFullYear();
  const mes  = String(date.getMonth() + 1).padStart(2, '0');
  const dia  = String(date.getDate()).padStart(2, '0');
  // Orden correcto: DIA + MES + AÑO  (DDMMAAAA)
  return `${dia}${mes}${anio}`;
}

/**
 * Construye los parámetros base que se adjuntan a TODA petición a la API.
 * El ticket es el único parámetro de autenticación.
 *
 * @param {Object} [extra={}] - Parámetros adicionales específicos del endpoint
 * @returns {Object} Objeto de query params listo para pasar a axios
 */
function buildParams(extra = {}) {
  if (!TICKET) {
    throw new Error(
      '[MercadoPublicoService] El ticket de acceso no está configurado. ' +
      'Define la variable de entorno MERCADO_PUBLICO_TICKET en tu archivo .env'
    );
  }
  return { ticket: TICKET, ...extra };
}

/**
 * Maneja y normaliza los errores provenientes de la API o de la red.
 * Re-lanza un Error enriquecido con código HTTP, mensaje y contexto.
 *
 * @param {import('axios').AxiosError} error - Error capturado en el catch
 * @param {string} contexto - Descripción breve del método que falló
 * @throws {Error}
 */
function handleApiError(error, contexto) {
  if (error.response) {
    // ── La API respondió con un código de error HTTP ──────────────────────────
    const { status, data } = error.response;
    const mensaje = data?.message || data?.Mensaje || JSON.stringify(data);

    const errorMap = {
      400: `[${contexto}] Solicitud inválida (400): ${mensaje}`,
      401: `[${contexto}] Ticket inválido o expirado (401). Verifica MERCADO_PUBLICO_TICKET.`,
      404: `[${contexto}] Recurso no encontrado (404): ${mensaje}`,
      429: `[${contexto}] Límite de peticiones excedido (429). Intenta más tarde.`,
      500: `[${contexto}] Error interno del servidor de la API (500): ${mensaje}`,
    };

    throw new Error(errorMap[status] || `[${contexto}] Error HTTP ${status}: ${mensaje}`);
  }

  if (error.code === 'ECONNABORTED') {
    // ── Timeout de la petición ────────────────────────────────────────────────
    throw new Error(
      `[${contexto}] Timeout: la API no respondió en ${REQUEST_TIMEOUT_MS / 1000} segundos.`
    );
  }

  if (error.request) {
    // ── La petición salió pero no hubo respuesta (red caída, DNS, etc.) ───────
    throw new Error(
      `[${contexto}] Sin respuesta de la API. Verifica conectividad o DNS. ` +
      `Código: ${error.code}`
    );
  }

  // ── Error de configuración u otro ─────────────────────────────────────────
  throw new Error(`[${contexto}] Error inesperado: ${error.message}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// MÉTODOS PÚBLICOS DEL SERVICIO
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene las licitaciones publicadas HOY.
 *
 * Endpoint: GET /licitaciones?fecha=DDMMAAAA&ticket=TU_TICKET
 *
 * La API usa la fecha en formato "DDMMAAAA" como filtro. Al pasar la fecha
 * actual obtenemos solo las licitaciones publicadas durante el día en curso.
 *
 * @returns {Promise<RespuestaListado>} Objeto con `Cantidad` y `Listado`
 */
async function getLicitacionesHoy() {
  const hoy     = formatFechaAPI(new Date());
  // Endpoint: /licitaciones
  // Parámetro `fecha`: filtra por fecha de publicación (formato DDMMAAAA)
  const url     = '/licitaciones';
  const params  = buildParams({ fecha: hoy });

  try {
    const { data } = await apiClient.get(url, { params });
    return normalizarListado(data);
  } catch (err) {
    handleApiError(err, 'getLicitacionesHoy');
  }
}

/**
 * Busca una licitación específica por su código/ID.
 *
 * Endpoint: GET /licitaciones/{codigoLicitacion}?ticket=TU_TICKET
 *
 * El código tiene el formato de Mercado Público: "NNNN-NN-XXNN"
 * Ejemplo válido: "750622-19-LQ24"
 *
// ──────────────────────────────────────────────────────────────────────────────
// CACHÉ EN MEMORIA PARA FICHAS DETALLADAS (Protege la cuota del ticket)
// ──────────────────────────────────────────────────────────────────────────────
const detalleCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de caché

/**
 * Deduce el tipo de licitación a partir de las letras del código único.
 * Formato estándar MP: [Organismo]-[Correlativo]-[Tipo][Año] (ej: 1509-5-LQ26, 750622-19-L124)
 * @param {string} codigo
 * @returns {string|null}
 */
function deducirTipoDeCodigo(codigo) {
  if (!codigo || typeof codigo !== 'string') return null;
  const match = codigo.match(/-([A-Za-z]+[0-9]*)\d{2}$/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Infiere el organismo comprador si viene mencionado en el nombre de la licitación.
 * @param {string} nombre
 * @returns {string|null}
 */
function inferirOrganismoDeTexto(nombre) {
  if (!nombre || typeof nombre !== 'string') return null;
  const match = nombre.match(/(?:para (?:el|la|los|las)?\s*|en (?:el|la)?\s*)?((?:Hospital|Municipalidad|I\.?\s*Municipalidad|Servicio de Salud|Universidad|Ministerio|Subsecretar[ií]a|Intendencia|Gobernaci[oó]n|Carabineros|Ej[eé]rcito|Armada|FACH|PDI|JUNAEB|JUNJI|SENAME|SENCE|SAG|CONAF|FOSIS|INDAP|SERNAC|TGR|SII|MOP|MINEDUC|MINSAL|MINVU)\b[^\n,.;()]*)/i);
  return match ? match[1].trim() : null;
}

/**
 * Busca una licitación específica por su código/ID y retorna su detalle completo.
 * La API oficial de Mercado Público consulta por query param: ?codigo=[CODIGO]&ticket=[TICKET]
 *
 * @param {string} codigoLicitacion - Código único de la licitación
 * @returns {Promise<LicitacionDetalle>} Detalle completo normalizado de la licitación
 */
async function getLicitacionById(codigoLicitacion) {
  if (!codigoLicitacion || typeof codigoLicitacion !== 'string') {
    throw new Error('[getLicitacionById] El parámetro codigoLicitacion es obligatorio y debe ser string.');
  }

  const codigoLimpio = codigoLicitacion.trim();

  // 1. Revisar si ya está en caché válida
  const cacheItem = detalleCache.get(codigoLimpio);
  if (cacheItem && Date.now() - cacheItem.timestamp < CACHE_TTL_MS) {
    return cacheItem.data;
  }

  // 2. Consulta a la API con parámetro ?codigo=
  const params = buildParams({ codigo: codigoLimpio });
  let rawResponseData = null;

  try {
    const { data } = await apiClient.get('/licitaciones.json', { params });
    rawResponseData = data;
  } catch (err) {
    // Fallback a ruta sin .json en caso de variación
    try {
      const { data } = await apiClient.get('/licitaciones', { params });
      rawResponseData = data;
    } catch (fallbackErr) {
      handleApiError(err, 'getLicitacionById');
    }
  }

  const detalleNormalizado = normalizarDetalle(rawResponseData, codigoLimpio);

  // Guardar en caché
  if (detalleNormalizado) {
    detalleCache.set(codigoLimpio, { data: detalleNormalizado, timestamp: Date.now() });
  }

  return detalleNormalizado;
}

/**
 * Busca licitaciones por estado.
 *
 * Endpoint: GET /licitaciones?estado=XX&ticket=TU_TICKET
 *
 * Estados comunes de la API:
 *   - "5"  → Publicada (activa)
 *   - "6"  → Cerrada
 *   - "7"  → Desierta
 *   - "8"  → Adjudicada
 *   - "18" → Revocada
 *
 * @param {string|number} estado - Código de estado (ver lista arriba)
 * @returns {Promise<RespuestaListado>}
 */
async function getLicitacionesPorEstado(estado) {
  if (estado === undefined || estado === null) {
    throw new Error('[getLicitacionesPorEstado] El parámetro estado es obligatorio.');
  }
  // Parámetro `estado`: filtra licitaciones por su código de estado numérico
  const params = buildParams({ estado: String(estado) });

  try {
    const { data } = await apiClient.get('/licitaciones', { params });
    return normalizarListado(data);
  } catch (err) {
    handleApiError(err, 'getLicitacionesPorEstado');
  }
}

/**
 * Busca licitaciones en un rango de fechas.
 *
 * Endpoint: GET /licitaciones?fechaInicio=DDMMAAAA&fechaFin=DDMMAAAA&ticket=TU_TICKET
 *
 * Útil para reportes y análisis históricos. Las fechas se convierten
 * automáticamente al formato "DDMMAAAA" que requiere la API.
 *
 * @param {Date} fechaInicio - Fecha de inicio del rango
 * @param {Date} fechaFin    - Fecha de fin del rango
 * @returns {Promise<RespuestaListado>}
 */
async function getLicitacionesPorRango(fechaInicio, fechaFin) {
  if (!(fechaInicio instanceof Date) || !(fechaFin instanceof Date)) {
    throw new Error('[getLicitacionesPorRango] fechaInicio y fechaFin deben ser instancias de Date.');
  }
  if (fechaInicio > fechaFin) {
    throw new Error('[getLicitacionesPorRango] fechaInicio no puede ser posterior a fechaFin.');
  }

  const params = buildParams({
    // fechaInicio/fechaFin: acotan la búsqueda al rango indicado (formato DDMMAAAA)
    fechaInicio: formatFechaAPI(fechaInicio),
    fechaFin:    formatFechaAPI(fechaFin),
  });

  try {
    const { data } = await apiClient.get('/licitaciones', { params });
    return normalizarListado(data);
  } catch (err) {
    handleApiError(err, 'getLicitacionesPorRango');
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// NORMALIZADORES DE RESPUESTA
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Garantiza que la respuesta de listado siempre tenga la forma esperada:
 * { Cantidad: number, Listado: LicitacionResumen[] }
 * Mapea CodigoExterno oficial a CodigoLicitacion e infiere Tipo y Organismo si faltan.
 *
 * @param {any} data - Respuesta cruda de la API
 * @returns {RespuestaListado}
 */
function normalizarListado(data) {
  if (!data || typeof data !== 'object') {
    return { Cantidad: 0, Listado: [] };
  }

  const rawListado = Array.isArray(data.Listado) ? data.Listado : [];
  const listadoNormalizado = rawListado.map(item => {
    const codigo = item.CodigoExterno || item.CodigoLicitacion || item.id || null;
    const tipo = item.Tipo || deducirTipoDeCodigo(codigo);
    const organismo = item.Organismo || item.Comprador?.NombreOrganismo || inferirOrganismoDeTexto(item.Nombre) || '—';

    return {
      ...item,
      CodigoLicitacion: codigo,
      CodigoExterno: codigo,
      Tipo: tipo,
      Organismo: organismo,
      MontoPesos: item.MontoEstimado || item.MontoPesos || null,
    };
  });

  return {
    Cantidad: typeof data.Cantidad === 'number' ? data.Cantidad : listadoNormalizado.length,
    Listado: listadoNormalizado,
  };
}

/**
 * Normaliza la respuesta detallada de una licitación devuelta por la API.
 * Desempaqueta { Listado: [ item ] } y extrae el comprador, monto, fechas e ítems.
 *
 * @param {any} data - Respuesta cruda de la API
 * @param {string} codigoSolicitado - Código que se consultó
 * @returns {Object} Ficha detallada limpia
 */
function normalizarDetalle(data, codigoSolicitado = '') {
  if (!data) return null;

  // Mercado Público devuelve el detalle en un arreglo Listado de 1 elemento
  const item = Array.isArray(data.Listado) && data.Listado.length > 0
    ? data.Listado[0]
    : (data.detalle || data);

  if (!item || typeof item !== 'object') return data;

  const codigo = item.CodigoExterno || item.CodigoLicitacion || codigoSolicitado || '';
  const comprador = item.Comprador || {};
  const itemsRaw = item.Items?.Listado || item.Items || [];

  return {
    ...item,
    CodigoLicitacion: codigo,
    CodigoExterno: codigo,
    Nombre: item.Nombre || 'Sin nombre',
    Descripcion: item.Descripcion || 'Sin descripción disponible',
    Organismo: comprador.NombreOrganismo || item.Organismo || inferirOrganismoDeTexto(item.Nombre) || 'Sin Organismo',
    NombreRegion: comprador.RegionUnidad || item.NombreRegion || 'Sin Región',
    Comuna: comprador.ComunaUnidad || item.Comuna || 'Sin Comuna',
    RutOrganismo: comprador.RutUnidad || item.RutOrganismo || '',
    ResponsableContrato: comprador.NombreUsuario || item.ResponsableContrato || 'No especificado',
    MontoPesos: item.MontoEstimado || item.MontoPesos || null,
    Moneda: item.Moneda || 'CLP',
    Tipo: item.Tipo || deducirTipoDeCodigo(codigo),
    FechaPublicacion: item.FechaCreacion || item.FechaPublicacion || '',
    FechaCierre: item.FechaCierre || '',
    CodigoEstado: item.CodigoEstado || 5,
    Items: Array.isArray(itemsRaw) ? itemsRaw.map((it, idx) => ({
      Correlativo: it.Correlativo || idx + 1,
      NombreProducto: it.NombreProducto || it.Descripcion || it.Nombre || 'Producto / Requerimiento',
      Cantidad: it.Cantidad || 1,
      UnidadMedida: it.UnidadMedida || 'Unidad',
      Categoria: it.Categoria || '',
    })) : []
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────────────────────

module.exports = {
  getLicitacionesHoy,
  getLicitacionById,
  getLicitacionesPorEstado,
  getLicitacionesPorRango,
};
