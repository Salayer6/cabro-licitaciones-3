/**
 * iaService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio para generar recomendaciones inteligentes de licitaciones basadas
 * en el perfil de la empresa del usuario.
 *
 * Utiliza la API de Gemini 1.5 Flash (REST directo a Google AI Studio) si está
 * configurada la variable GEMINI_API_KEY. De lo contrario, cae a un motor
 * heurístico inteligente basado en coincidencia semántica local y análisis de
 * palabras clave.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ── MOTOR HEURÍSTICO LOCAL (FALLBACK) ────────────────────────────────────────

/**
 * Analiza licitaciones en base a coincidencia inteligente de keywords
 * derivando términos de interés desde el perfil de la empresa.
 */
function analizarHeuristico(licitaciones, perfilEmpresa) {
  const perfil = perfilEmpresa.toLowerCase();
  
  // Extraemos términos de interés significativos del perfil (palabras > 3 caracteres)
  const palabrasFiltro = perfil
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 3);

  // Palabras comunes a ignorar para refinar el match
  const stopwords = new Set([
    'para', 'como', 'con', 'desde', 'hacia', 'hasta', 'para', 'por', 'segun', 'sin', 'sobre', 'tras',
    'este', 'esta', 'estos', 'estas', 'esos', 'esas', 'aquel', 'aquella', 'suyo', 'suya', 'cuyo',
    'servicios', 'servicio', 'productos', 'producto', 'empresa', 'venta', 'compra', 'adquisicion',
    'contratacion', 'suministro', 'desarrollo', 'provision'
  ]);

  const palabrasClave = palabrasFiltro.filter(p => !stopwords.has(p));

  return licitaciones.map(l => {
    const nombre = (l.Nombre || '').toLowerCase();
    const organismo = (l.Organismo || '').toLowerCase();
    const descripcion = (l.Descripcion || '').toLowerCase();
    const textoCompleto = `${nombre} ${organismo} ${descripcion}`;

    let score = 0;
    let coincidencias = [];

    // 1. Coincidencia por palabras clave derivadas del perfil
    palabrasClave.forEach(palabra => {
      if (textoCompleto.includes(palabra)) {
        score += 25; // 25 puntos por palabra clave encontrada
        coincidencias.push(palabra);
      }
    });

    // 2. Coincidencia directa del perfil completo (frase exacta)
    if (textoCompleto.includes(perfil)) {
      score += 40;
    }

    // 3. Ajuste según el tipo de licitación
    // Ej: Compra ágil (E) o menor cuantía suele tener menos barreras de entrada
    if (l.Tipo === 'E' || l.Tipo === 'LS1') {
      score += 5;
    }

    // Cap al score en 100
    score = Math.min(score, 100);

    // Determinar nivel de match y recomendación
    let match = 'Bajo';
    let justificacion = 'Esta licitación no tiene suficiente coincidencia directa con los términos de tu perfil comercial.';

    if (score >= 70) {
      match = 'Alto';
      justificacion = `Excelente coincidencia con tu perfil comercial. Encontramos múltiples coincidencias directas con "${coincidencias.join(', ')}". El comprador es ${l.Organismo || 'un organismo público'}.`;
    } else if (score >= 30) {
      match = 'Medio';
      justificacion = `Coincidencia parcial. Existe un interés potencial relacionado con "${coincidencias.slice(0, 3).join(', ')}". Recomendamos revisar las bases para evaluar factibilidad.`;
    } else if (coincidencias.length > 0) {
      match = 'Bajo';
      justificacion = `Coincidencia marginal en la palabra "${coincidencias[0]}". Probablemente el rubro no es tu foco principal.`;
    }

    return {
      CodigoLicitacion: l.CodigoLicitacion,
      Nombre: l.Nombre,
      Organismo: l.Organismo,
      MontoPesos: l.MontoPesos,
      FechaCierre: l.FechaCierre,
      Score: score,
      Match: match,
      Justificacion: justificacion
    };
  }).sort((a, b) => b.Score - a.Score); // Ordenar por relevancia
}

// ── INTEGRACIÓN CON GEMINI IA (GOOGLE AI STUDIO) ─────────────────────────────

/**
 * Solicita el análisis a la API de Gemini 1.5 Flash.
 */
async function analizarConGemini(licitaciones, perfilEmpresa) {
  // Reducimos el payload para optimizar los tokens y evitar 413 (Payload Too Large)
  const licitacionesSimplificadas = licitaciones.map(l => ({
    id: l.CodigoLicitacion,
    nombre: l.Nombre,
    organismo: l.Organismo,
    monto: l.MontoPesos,
    tipo: l.Tipo
  }));

  const systemInstruction = 
    `Eres un analista experto en licitaciones públicas chilenas y desarrollo de negocios. ` +
    `Tu objetivo es evaluar una lista de licitaciones y determinar su nivel de coincidencia (match) ` +
    `con el perfil comercial de una empresa.\n\n` +
    `Debes responder EXCLUSIVAMENTE con un arreglo en formato JSON con la siguiente estructura, sin textos explicativos ni formateo markdown (no uses \`\`\`json ni nada similar):\n` +
    `[\n` +
    `  {\n` +
    `    "CodigoLicitacion": "ID de la licitación",\n` +
    `    "Score": 85, // Número entero de 0 a 100\n` +
    `    "Match": "Alto", // Solo puede ser: "Alto", "Medio" o "Bajo"\n` +
    `    "Justificacion": "Una explicación breve en español de por qué es una buena o mala opción."\n` +
    `  }\n` +
    `]`;

  const prompt = 
    `Perfil Comercial de la Empresa: "${perfilEmpresa}"\n\n` +
    `Lista de Licitaciones:\n${JSON.stringify(licitacionesSimplificadas, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await axios.post(url, {
    contents: [{
      parts: [{ text: prompt }]
    }],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  }, {
    timeout: 15000 // 15 segundos max de espera para la IA
  });

  const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('La API de Gemini devolvió una respuesta vacía o con formato inesperado.');
  }

  // Parsear la respuesta estructurada de Gemini
  const recomendacionesIA = JSON.parse(rawText.trim());

  // Mezclar la recomendación con los datos de las licitaciones originales para que el frontend tenga todo el detalle
  return licitaciones.map(l => {
    const rec = recomendacionesIA.find(r => r.CodigoLicitacion === l.CodigoLicitacion) || {
      Score: 10,
      Match: 'Bajo',
      Justificacion: 'No fue posible analizar esta licitación con el motor de IA de forma individual.'
    };

    return {
      CodigoLicitacion: l.CodigoLicitacion,
      Nombre: l.Nombre,
      Organismo: l.Organismo,
      MontoPesos: l.MontoPesos,
      FechaCierre: l.FechaCierre,
      Score: rec.Score,
      Match: rec.Match,
      Justificacion: rec.Justificacion
    };
  }).sort((a, b) => b.Score - a.Score);
}

// ── FUNCIÓN DE ENTRADA PRINCIPAL ─────────────────────────────────────────────

/**
 * Obtiene recomendaciones personalizadas para un conjunto de licitaciones.
 *
 * @param {Array} licitaciones - Listado de licitaciones oficiales
 * @param {string} perfilEmpresa - Perfil comercial de la empresa
 * @returns {Promise<Array>} Lista de licitaciones evaluadas
 */
async function obtenerRecomendaciones(licitaciones, perfilEmpresa) {
  if (!licitaciones || licitaciones.length === 0) {
    return [];
  }
  if (!perfilEmpresa || perfilEmpresa.trim() === '') {
    throw new Error('El perfil de la empresa es obligatorio para poder analizar.');
  }

  if (GEMINI_API_KEY) {
    try {
      console.log('[iaService] Iniciando análisis con Gemini 1.5 Flash...');
      return await analizarConGemini(licitaciones, perfilEmpresa);
    } catch (err) {
      console.error('[iaService] Falló el análisis con Gemini, usando motor heurístico local:', err.message);
      return analizarHeuristico(licitaciones, perfilEmpresa);
    }
  } else {
    console.log('[iaService] Sin GEMINI_API_KEY configurado. Usando motor heurístico local.');
    return analizarHeuristico(licitaciones, perfilEmpresa);
  }
}

module.exports = {
  obtenerRecomendaciones
};
