/**
 * analytics.js
 * Motor de cálculo de analítica de operación y competencia.
 * Recibe el Listado de licitaciones de la API y devuelve métricas agregadas.
 */

// ── Mapas de referencia ───────────────────────────────────────────────────────

export const ESTADO_MAP = {
  '5':  'Publicada',
  '6':  'Cerrada',
  '7':  'Desierta',
  '8':  'Adjudicada',
  '18': 'Revocada',
}

export const ESTADO_COLOR = {
  'Publicada':   '#34d399',
  'Cerrada':     '#fbbf24',
  'Desierta':    '#f87171',
  'Adjudicada':  '#60a5fa',
  'Revocada':    '#9ca3af',
  'Otro':        '#a78bfa',
}

export const TIPO_MAP = {
  'LS1': 'Licitación < 100 UTM',
  'LP':  'Propuesta Pública',
  'LQ':  'Licitación > 1000 UTM',
  'LE':  'Licitación < 1000 UTM',
  'CO':  'Convenio Marco',
  'B':   'Compra Directa',
  'E':   'Compra Ágil',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMonto(val) {
  if (!val) return 0
  const n = Number(String(val).replace(/[^\d]/g, ''))
  return isNaN(n) ? 0 : n
}

function formatCLP(n) {
  if (n === 0) return null
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function topN(map, n = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

// ── ANALÍTICA DE OPERACIÓN ────────────────────────────────────────────────────

/**
 * Calcula KPIs y distribuciones operacionales.
 * @param {Array} listado - Listado de la API
 * @returns {Object} métricas de operación
 */
export function calcularAnaliticaOperacion(listado) {
  if (!listado || listado.length === 0) return null

  const total = listado.length
  const montos = listado.map(l => parseMonto(l.MontoPesos))
  const montoTotal = montos.reduce((a, b) => a + b, 0)
  const conMonto = montos.filter(m => m > 0)
  const montoPromedio = conMonto.length > 0 ? conMonto.reduce((a, b) => a + b, 0) / conMonto.length : 0
  const montoMaximo = Math.max(...montos)

  // Distribución por estado
  const porEstado = {}
  listado.forEach(l => {
    const label = ESTADO_MAP[String(l.CodigoEstado)] || 'Otro'
    porEstado[label] = (porEstado[label] || 0) + 1
  })
  const distribucionEstado = Object.entries(porEstado).map(([name, value]) => ({
    name,
    value,
    pct: ((value / total) * 100).toFixed(1),
    fill: ESTADO_COLOR[name] || ESTADO_COLOR['Otro'],
  }))

  // Distribución por tipo de licitación
  const porTipo = {}
  listado.forEach(l => {
    const tipo = l.Tipo || 'Otro'
    const label = TIPO_MAP[tipo] || tipo
    porTipo[label] = (porTipo[label] || 0) + 1
  })
  const distribucionTipo = topN(porTipo).map(([name, value]) => ({
    name,
    value,
    pct: ((value / total) * 100).toFixed(1),
  }))

  // Distribución por hora de publicación (si FechaPublicacion existe)
  const porHora = {}
  listado.forEach(l => {
    if (!l.FechaPublicacion) return
    try {
      const hora = new Date(l.FechaPublicacion).getHours()
      const label = `${String(hora).padStart(2, '0')}:00`
      porHora[label] = (porHora[label] || 0) + 1
    } catch {}
  })
  const distribucionHora = Object.entries(porHora)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hora, count]) => ({ hora, count }))

  // Licitaciones por rango de monto
  const rangos = {
    'Sin monto': 0,
    '< 100 UTM': 0,
    '100–1000 UTM': 0,
    '> 1000 UTM': 0,
  }
  // 1 UTM ≈ $66.000 CLP (valor referencial 2025)
  const UTM = 66000
  montos.forEach(m => {
    if (m === 0) rangos['Sin monto']++
    else if (m < 100 * UTM) rangos['< 100 UTM']++
    else if (m < 1000 * UTM) rangos['100–1000 UTM']++
    else rangos['> 1000 UTM']++
  })
  const distribucionMonto = Object.entries(rangos).map(([name, value]) => ({
    name,
    value,
    pct: ((value / total) * 100).toFixed(1),
  }))

  return {
    kpis: {
      total,
      montoTotal: formatCLP(montoTotal),
      montoTotalRaw: montoTotal,
      montoPromedio: formatCLP(Math.round(montoPromedio)),
      montoMaximo: formatCLP(montoMaximo),
      conMonto: conMonto.length,
      sinMonto: total - conMonto.length,
    },
    distribucionEstado,
    distribucionTipo,
    distribucionHora,
    distribucionMonto,
  }
}

// ── ANALÍTICA DE COMPETENCIA ──────────────────────────────────────────────────

/**
 * Calcula métricas de competencia y mercado.
 * @param {Array} listado
 * @returns {Object} métricas de competencia
 */
export function calcularAnaliticaCompetencia(listado) {
  if (!listado || listado.length === 0) return null

  const total = listado.length

  // Ranking de organismos por cantidad de licitaciones
  const porOrganismo = {}
  const montosPorOrganismo = {}
  listado.forEach(l => {
    const org = l.Organismo || 'Sin organismo'
    porOrganismo[org] = (porOrganismo[org] || 0) + 1
    const m = parseMonto(l.MontoPesos)
    montosPorOrganismo[org] = (montosPorOrganismo[org] || 0) + m
  })

  const rankingOrganismos = topN(porOrganismo, 10).map(([nombre, cantidad]) => ({
    nombre,
    cantidad,
    pct: ((cantidad / total) * 100).toFixed(1),
    montoTotal: formatCLP(montosPorOrganismo[nombre] || 0),
    montoRaw: montosPorOrganismo[nombre] || 0,
  }))

  // Concentración de mercado: ¿cuántos organismos concentran el 50% de las licitaciones?
  const sorted = Object.values(porOrganismo).sort((a, b) => b - a)
  let acumulado = 0
  let organismos50 = 0
  for (const v of sorted) {
    acumulado += v
    organismos50++
    if (acumulado >= total * 0.5) break
  }
  const totalOrganismos = Object.keys(porOrganismo).length

  // Oportunidades activas (estado Publicada = '5')
  const oportunidades = listado.filter(l => String(l.CodigoEstado) === '5')
  const montoOportunidades = oportunidades.reduce((a, l) => a + parseMonto(l.MontoPesos), 0)

  // Distribución de oportunidades por tipo
  const oporPorTipo = {}
  oportunidades.forEach(l => {
    const tipo = TIPO_MAP[l.Tipo] || l.Tipo || 'Otro'
    oporPorTipo[tipo] = (oporPorTipo[tipo] || 0) + 1
  })
  const oportunidadesPorTipo = topN(oporPorTipo, 6).map(([name, value]) => ({
    name,
    value,
    pct: ((value / (oportunidades.length || 1)) * 100).toFixed(1),
  }))

  // Top organismos por MONTO total (competencia financiera)
  const rankingPorMonto = topN(montosPorOrganismo, 8).map(([nombre, montoRaw]) => ({
    nombre: nombre.length > 30 ? nombre.slice(0, 28) + '…' : nombre,
    monto: Math.round(montoRaw / 1_000_000), // en millones CLP
    montoLabel: formatCLP(montoRaw),
  }))

  // Índice de competitividad: ratio licitaciones/organismo
  const ratioLic = (total / totalOrganismos).toFixed(1)

  return {
    mercado: {
      totalOrganismos,
      organismos50pct: organismos50,
      concentracion: ((organismos50 / totalOrganismos) * 100).toFixed(1),
      ratioLicitacionesPorOrganismo: ratioLic,
    },
    oportunidades: {
      total: oportunidades.length,
      montoTotal: formatCLP(montoOportunidades),
      pct: ((oportunidades.length / total) * 100).toFixed(1),
    },
    rankingOrganismos,
    rankingPorMonto,
    oportunidadesPorTipo,
  }
}
