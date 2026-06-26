/**
 * mercadoPublicoRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Rutas Express que exponen el servicio de Mercado Público como endpoints REST.
 *
 * Prefijo recomendado al registrar: /api/mp
 * (Ej: app.use('/api/mp', require('./mercadoPublicoRoutes')))
 *
 * Endpoints disponibles:
 *   GET /api/mp/licitaciones/hoy           → Licitaciones publicadas hoy
 *   GET /api/mp/licitaciones/:id           → Detalle de licitación por código
 *   GET /api/mp/licitaciones/estado/:est   → Licitaciones filtradas por estado
 *   GET /api/mp/licitaciones/rango         → Licitaciones en rango de fechas
 *                                            Query: ?desde=AAAAMMDD&hasta=AAAAMMDD
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const service = require('./mercadoPublicoService');

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// HELPER: Envolver handlers async para capturar errores sin try/catch repetido
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Envuelve un handler async y reenvía cualquier error al middleware de Express.
 * @param {Function} fn - Handler async (req, res, next)
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ──────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: Verificar que el ticket esté configurado antes de cada petición
// ──────────────────────────────────────────────────────────────────────────────

router.use((req, res, next) => {
  if (!process.env.MERCADO_PUBLICO_TICKET) {
    return res.status(503).json({
      status:  'error',
      mensaje: 'El ticket de Mercado Público no está configurado en el servidor. ' +
               'Define MERCADO_PUBLICO_TICKET en el archivo .env.',
    });
  }
  next();
});

// ──────────────────────────────────────────────────────────────────────────────
// RUTAS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/mp/licitaciones/hoy
 * Retorna las licitaciones publicadas durante el día actual.
 *
 * Respuesta exitosa (200):
 * {
 *   status: "success",
 *   fecha: "2025-06-26",
 *   Cantidad: 42,
 *   Listado: [ { CodigoLicitacion, Nombre, ... }, ... ]
 * }
 */
router.get('/licitaciones/hoy', asyncHandler(async (req, res) => {
  const resultado = await service.getLicitacionesHoy();
  res.json({
    status:  'success',
    fecha:   new Date().toISOString().split('T')[0],
    ...resultado,
  });
}));

/**
 * GET /api/mp/licitaciones/rango
 * Retorna licitaciones publicadas en un rango de fechas.
 *
 * Query params:
 *   desde (string, requerido): Fecha de inicio en formato YYYY-MM-DD
 *   hasta (string, requerido): Fecha de fin   en formato YYYY-MM-DD
 *
 * Ejemplo: GET /api/mp/licitaciones/rango?desde=2025-06-01&hasta=2025-06-26
 */
router.get('/licitaciones/rango', asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({
      status:  'error',
      mensaje: 'Los parámetros "desde" y "hasta" son requeridos (formato YYYY-MM-DD).',
    });
  }

  const fechaInicio = new Date(desde);
  const fechaFin    = new Date(hasta);

  if (isNaN(fechaInicio) || isNaN(fechaFin)) {
    return res.status(400).json({
      status:  'error',
      mensaje: 'Las fechas proporcionadas no son válidas. Usa el formato YYYY-MM-DD.',
    });
  }

  const resultado = await service.getLicitacionesPorRango(fechaInicio, fechaFin);
  res.json({ status: 'success', desde, hasta, ...resultado });
}));

/**
 * GET /api/mp/licitaciones/estado/:estado
 * Retorna licitaciones filtradas por su código de estado.
 *
 * Estados comunes:
 *   5  → Publicada  |  6 → Cerrada  |  7 → Desierta
 *   8  → Adjudicada |  18 → Revocada
 *
 * Ejemplo: GET /api/mp/licitaciones/estado/5
 */
router.get('/licitaciones/estado/:estado', asyncHandler(async (req, res) => {
  const { estado } = req.params;

  // Validación: el estado debe ser un número
  if (!/^\d+$/.test(estado)) {
    return res.status(400).json({
      status:  'error',
      mensaje: 'El parámetro "estado" debe ser un número entero.',
    });
  }

  const resultado = await service.getLicitacionesPorEstado(estado);
  res.json({ status: 'success', estado, ...resultado });
}));

/**
 * GET /api/mp/licitaciones/:id
 * Retorna el detalle completo de una licitación por su código único.
 *
 * Ejemplo: GET /api/mp/licitaciones/750622-19-LQ24
 */
router.get('/licitaciones/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id.trim() === '') {
    return res.status(400).json({
      status:  'error',
      mensaje: 'El código de licitación no puede estar vacío.',
    });
  }

  const detalle = await service.getLicitacionById(id);
  res.json({ status: 'success', detalle });
}));

// ──────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE DE ERROR: captura errores del servicio y devuelve JSON estructurado
// ──────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  const mensaje = err.message || 'Error desconocido.';

  // Determinar el código HTTP apropiado según el mensaje de error del servicio
  let statusCode = 500;
  if (mensaje.includes('(400)')) statusCode = 400;
  else if (mensaje.includes('(401)')) statusCode = 401;
  else if (mensaje.includes('(404)')) statusCode = 404;
  else if (mensaje.includes('(429)')) statusCode = 429;
  else if (mensaje.includes('obligatorio') || mensaje.includes('inválido')) statusCode = 400;

  console.error(`[MercadoPublicoRoutes] ${mensaje}`);

  res.status(statusCode).json({
    status:  'error',
    mensaje,
  });
});

module.exports = router;
