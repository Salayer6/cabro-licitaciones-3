// Cargar variables de entorno desde .env (debe ir primero)
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// Rutas del servicio de API oficial de Mercado Público
const mercadoPublicoRoutes = require('./mercadoPublicoRoutes');

const app  = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── API oficial de Mercado Público (api.mercadopublico.cl) ───────────────────
// Compatible tanto con despliegue local (/api/mp) como Vercel serverless (/mp o /api/mp)
app.use(['/api/mp', '/mp'], mercadoPublicoRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status:  'ok',
    ticket:  !!process.env.MERCADO_PUBLICO_TICKET,
    version: '2.0.0',
  });
});

// ── Iniciar servidor (solo fuera de producción con Vercel) ───────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
    console.log(`🔑 Ticket configurado: ${!!process.env.MERCADO_PUBLICO_TICKET}`);
  });
}

module.exports = app;
