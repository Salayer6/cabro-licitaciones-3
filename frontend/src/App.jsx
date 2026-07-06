import { useState, useEffect } from 'react'
import AnalyticsView from './AnalyticsView.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES Y MAPAS
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_MAP = {
  '5':  { label: 'Publicada',  bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  '6':  { label: 'Cerrada',    bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  '7':  { label: 'Desierta',   bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  '8':  { label: 'Adjudicada', bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  '18': { label: 'Revocada',   bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
}

const TIPO_MAP = {
  'LS1': 'Lic. < 100 UTM',
  'LP':  'Prop. Pública',
  'LQ':  'Lic. > 1000 UTM',
  'LE':  'Lic. < 1000 UTM',
  'CO':  'Conv. Marco',
  'B':   'Compra Directa',
  'E':   'Compra Ágil',
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatMonto(monto) {
  if (!monto) return null
  const n = Number(monto)
  if (isNaN(n) || n === 0) return null
  return `$${n.toLocaleString('es-CL')}`
}

function formatFecha(fechaStr) {
  if (!fechaStr) return 'N/A'
  try {
    return new Date(fechaStr).toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return fechaStr }
}

function hoyFormatted() {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ codigo }) {
  const e = ESTADO_MAP[String(codigo)] || { label: `Est. ${codigo}`, bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' }
  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: '999px',
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      background: e.bg, color: e.color,
    }}>
      {e.label}
    </span>
  )
}

function LicitacionCard({ licitacion, onCopyId }) {
  const l = licitacion
  const monto = formatMonto(l.MontoPesos)
  const tipo = TIPO_MAP[l.Tipo] || l.Tipo

  return (
    <div className="glass card card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span
          className="badge badge-orange"
          style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.72rem' }}
          onClick={() => onCopyId(l.CodigoLicitacion)}
          title="Clic para copiar ID"
        >
          {l.CodigoLicitacion || 'N/A'} 📋
        </span>
        <EstadoBadge codigo={l.CodigoEstado} />
      </div>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', lineHeight: '1.4', fontWeight: 600 }}>
        {l.Nombre || 'Sin nombre'}
      </h3>
      <p style={{ color: 'var(--text-alt)', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <span>🏢</span> {l.Organismo || '—'}
      </p>
      {tipo && (
        <p style={{ color: 'var(--text-alt)', fontSize: '0.75rem', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--text-main)' }}>Tipo:</strong> {tipo}
        </p>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 700 }}>
          {monto || <span style={{ color: 'var(--text-alt)', fontWeight: 400 }}>Sin monto</span>}
        </span>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-alt)', marginBottom: '0.1rem' }}>Cierre</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>{formatFecha(l.FechaCierre)}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'licitaciones', label: '📋 Licitaciones' },
  { id: 'analitica',    label: '📊 Analítica' },
  { id: 'recomendador', label: '🤖 Recomendador IA' },
]

export default function App() {
  // Licitaciones cargadas del backend
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('licitaciones')

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(['5', '6', '7', '8', '18'])
  
  // Multiciudad (Comunas)
  const [comunas, setComunas] = useState([])
  const [nuevaComuna, setNuevaComuna] = useState('')
  
  // Rango de fechas
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [modoFiltroFecha, setModoFiltroFecha] = useState('hoy') // 'hoy' o 'rango'

  // Agrupamiento
  const [agruparPor, setAgruparPor] = useState('sin') // 'sin', 'organismo', 'estado', 'tipo'
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // IA Recomendador
  const [perfilEmpresa, setPerfilEmpresa] = useState(() => {
    return localStorage.getItem('perfil_empresa') || ''
  })
  const [recomendaciones, setRecomendaciones] = useState([])
  const [loadingIA, setLoadingIA] = useState(false)

  // Carga inicial
  useEffect(() => {
    cargarLicitacionesHoy()
  }, [])

  // Auto-guardado de perfil de empresa
  const handlePerfilChange = (val) => {
    setPerfilEmpresa(val)
    localStorage.setItem('perfil_empresa', val)
  }

  const mostrarToast = (msg, tipo = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Peticiones al backend ──────────────────────────────────────────────────
  
  const cargarLicitacionesHoy = async () => {
    setLoading(true)
    setError(null)
    setModoFiltroFecha('hoy')
    try {
      const res  = await fetch('/api/mp/licitaciones/hoy')
      const data = await res.json()
      if (!res.ok || data.status === 'error') throw new Error(data.mensaje || `Error HTTP ${res.status}`)
      setLicitaciones(data.Listado || [])
      mostrarToast(`✅ ${data.Cantidad} licitaciones cargadas`, 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cargarLicitacionesRango = async () => {
    if (!fechaDesde || !fechaHasta) {
      mostrarToast('⚠️ Selecciona ambas fechas del rango', 'warning')
      return
    }
    setLoading(true)
    setError(null)
    setModoFiltroFecha('rango')
    try {
      const res = await fetch(`/api/mp/licitaciones/rango?desde=${fechaDesde}&hasta=${fechaHasta}`)
      const data = await res.json()
      if (!res.ok || data.status === 'error') throw new Error(data.mensaje || `Error HTTP ${res.status}`)
      setLicitaciones(data.Listado || [])
      mostrarToast(`✅ ${data.Cantidad} licitaciones en el rango`, 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Petición IA Recomendador
  const analizarConIA = async () => {
    if (!perfilEmpresa.trim()) {
      mostrarToast('⚠️ Describe el perfil comercial primero', 'warning')
      return
    }
    if (licitaciones.length === 0) {
      mostrarToast('⚠️ No hay licitaciones cargadas para analizar', 'warning')
      return
    }

    setLoadingIA(true)
    try {
      const res = await fetch('/api/mp/licitaciones/recomendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licitaciones,
          perfilEmpresa
        })
      })
      const data = await res.json()
      if (!res.ok || data.status === 'error') throw new Error(data.mensaje || 'Error al obtener recomendaciones.')
      setRecomendaciones(data.recomendaciones || [])
      mostrarToast('🤖 Recomendaciones generadas con éxito', 'success')
    } catch (err) {
      mostrarToast(`❌ Error IA: ${err.message}`, 'error')
    } finally {
      setLoadingIA(false)
    }
  }

  // ── Gestión de comunas (multiciudad) ───────────────────────────────────────
  
  const agregarComuna = () => {
    if (nuevaComuna.trim() && !comunas.includes(nuevaComuna.trim())) {
      setComunas([...comunas, nuevaComuna.trim()])
      setNuevaComuna('')
    }
  }

  const eliminarComuna = (c) => {
    setComunas(comunas.filter(item => item !== c))
  }

  const toggleEstado = (codigo) => {
    if (estadosSeleccionados.includes(codigo)) {
      setEstadosSeleccionados(estadosSeleccionados.filter(e => e !== codigo))
    } else {
      setEstadosSeleccionados([...estadosSeleccionados, codigo])
    }
  }

  const copiarId = (id) => {
    if (!id) return
    navigator.clipboard.writeText(id)
    mostrarToast(`📋 ID copiado: ${id}`, 'copy')
  }

  // ── Lógica de filtrado en cliente ──────────────────────────────────────────
  
  const licitacionesFiltradas = licitaciones.filter(l => {
    // 1. Búsqueda por texto (Nombre, Organismo, ID)
    const q = busqueda.toLowerCase()
    const matchesText = !busqueda.trim() || (
      (l.Nombre || '').toLowerCase().includes(q) ||
      (l.Organismo || '').toLowerCase().includes(q) ||
      (l.CodigoLicitacion || '').toLowerCase().includes(q)
    )

    // 2. Filtro por Estado
    const matchesEstado = estadosSeleccionados.includes(String(l.CodigoEstado))

    // 3. Filtro Multiciudad (Comunas / Regiones buscando en el nombre u organismo)
    let matchesComuna = true
    if (comunas.length > 0) {
      matchesComuna = comunas.some(c => {
        const comunaNormalizada = c.toLowerCase()
        return (
          (l.Nombre || '').toLowerCase().includes(comunaNormalizada) ||
          (l.Organismo || '').toLowerCase().includes(comunaNormalizada)
        )
      })
    }

    return matchesText && matchesEstado && matchesComuna
  })

  // ── Lógica de agrupamiento ─────────────────────────────────────────────────
  
  const licitacionesAgrupadas = () => {
    if (agruparPor === 'sin') {
      return { 'Todas las licitaciones': licitacionesFiltradas }
    }
    const grupos = {}
    licitacionesFiltradas.forEach(l => {
      let clave = 'Sin clasificar'
      if (agruparPor === 'organismo') {
        clave = l.Organismo || 'Sin Organismo'
      } else if (agruparPor === 'estado') {
        clave = ESTADO_MAP[String(l.CodigoEstado)]?.label || `Estado ${l.CodigoEstado}`
      } else if (agruparPor === 'tipo') {
        clave = TIPO_MAP[l.Tipo] || l.Tipo || 'Otros tipos'
      }

      if (!grupos[clave]) grupos[clave] = []
      grupos[clave].push(l)
    })
    return grupos
  }

  const agrupaciones = licitacionesAgrupadas()

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="container">

      {/* ── HEADER ── */}
      <header>
        <div>
          <div className="logo">Nata de Mercado Público</div>
          <p style={{ color: 'var(--text-alt)', fontSize: '0.8rem', marginTop: '0.25rem', textTransform: 'capitalize' }}>
            {hoyFormatted()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{ borderColor: mostrarFiltros ? 'var(--primary)' : 'var(--border)' }}
          >
            ⚙️ Filtros Avanzados
          </button>
          <button
            className="btn btn-primary"
            onClick={modoFiltroFecha === 'hoy' ? cargarLicitacionesHoy : cargarLicitacionesRango}
            disabled={loading}
          >
            {loading ? <><div className="loading-spinner" />&nbsp;Cargando...</> : '🔄 Actualizar'}
          </button>
        </div>
      </header>

      {/* ── FILTROS AVANZADOS EXPANDIBLES ── */}
      {mostrarFiltros && (
        <div className="glass card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'slideIn 0.25s ease' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* 1. Multi-fecha (Filtro por Rango) */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 600 }}>📅 Rango de Fechas</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  style={{
                    padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--bg-dark)', color: 'white', fontSize: '0.8rem', width: '100%'
                  }}
                />
                <span style={{ color: 'var(--text-alt)', fontSize: '0.8rem' }}>a</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  style={{
                    padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--bg-dark)', color: 'white', fontSize: '0.8rem', width: '100%'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }} onClick={cargarLicitacionesRango}>
                  Filtrar Rango
                </button>
                {modoFiltroFecha === 'rango' && (
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }} onClick={cargarLicitacionesHoy}>
                    Volver a Hoy
                  </button>
                )}
              </div>
            </div>

            {/* 2. Multi-ciudad (Tags) */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 600 }}>📍 Filtro Multiciudad (Comunas)</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ej: Las Condes, Temuco..."
                  value={nuevaComuna}
                  onChange={e => setNuevaComuna(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarComuna()}
                  style={{
                    padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--bg-dark)', color: 'white', fontSize: '0.8rem', width: '100%', outline: 'none'
                  }}
                />
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '8px' }} onClick={agregarComuna}>➕</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {comunas.length === 0 ? (
                  <p style={{ color: 'var(--text-alt)', fontSize: '0.75rem' }}>Sin filtros de ciudad. Mostrando todas.</p>
                ) : (
                  comunas.map(c => (
                    <span key={c} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                      padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600
                    }}>
                      {c}
                      <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => eliminarComuna(c)}>×</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 3. Multi-estado */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 600 }}>🚥 Filtrar por Estado</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {Object.entries(ESTADO_MAP).map(([codigo, val]) => {
                  const seleccionado = estadosSeleccionados.includes(codigo)
                  return (
                    <button
                      key={codigo}
                      onClick={() => toggleEstado(codigo)}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '8px',
                        border: '1px solid transparent', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                        background: seleccionado ? val.bg : 'rgba(255,255,255,0.03)',
                        color: seleccionado ? val.color : 'var(--text-alt)',
                        borderColor: seleccionado ? val.color : 'transparent'
                      }}
                    >
                      {val.label}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Agrupamiento y ordenamiento */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-alt)', fontSize: '0.8rem', fontWeight: 600 }}>🗂️ Agrupar por:</span>
              <select
                value={agruparPor}
                onChange={e => setAgruparPor(e.target.value)}
                style={{
                  background: 'var(--bg-dark)', border: '1px solid var(--border)',
                  color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', outline: 'none'
                }}
              >
                <option value="sin">Sin agrupar</option>
                <option value="organismo">Organismo Comprador</option>
                <option value="estado">Estado de la Licitación</option>
                <option value="tipo">Tipo de Licitación</option>
              </select>
            </div>
            
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent)', borderColor: 'rgba(244,63,94,0.3)' }}
              onClick={() => {
                setComunas([])
                setEstadosSeleccionados(['5', '6', '7', '8', '18'])
                setAgruparPor('sin')
                setBusqueda('')
                setFechaDesde('')
                setFechaHasta('')
                mostrarToast('Filtros reiniciados', 'info')
              }}
            >
              🧹 Limpiar Todos los Filtros
            </button>
          </div>

        </div>
      )}

      {/* ── NAVEGACIÓN POR TABS ── */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '2rem',
        background: 'rgba(15,23,42,0.6)', padding: '0.3rem',
        borderRadius: '14px', width: 'fit-content',
        border: '1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '0.55rem 1.4rem', borderRadius: '10px',
              border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
              transition: 'all 0.2s',
              background: activeTab === t.id
                ? 'linear-gradient(135deg, var(--primary), #7c3aed)'
                : 'transparent',
              color: activeTab === t.id ? 'white' : 'var(--text-alt)',
              boxShadow: activeTab === t.id ? '0 4px 12px rgba(139,92,246,0.35)' : 'none',
            }}
          >
            {t.label}
            {t.id === 'licitaciones' && licitaciones.length > 0 && (
              <span style={{
                marginLeft: '0.5rem', padding: '0.1rem 0.5rem',
                borderRadius: '999px', fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.2)', fontWeight: 700,
              }}>
                {licitacionesFiltradas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 1000,
          padding: '0.9rem 1.4rem', borderRadius: '12px',
          background: toast.tipo === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
          border: `1px solid ${toast.tipo === 'success' ? 'rgba(52,211,153,0.4)' : 'rgba(139,92,246,0.4)'}`,
          color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500,
          backdropFilter: 'blur(12px)',
          animation: 'slideIn 0.3s ease',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div className="glass card" style={{
          marginBottom: '2rem',
          borderLeft: '4px solid #f87171',
          padding: '1rem 1.5rem',
          background: 'rgba(239,68,68,0.08)',
        }}>
          <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '0.25rem' }}>⚠️ Error al cargar datos</p>
          <p style={{ color: 'var(--text-alt)', fontSize: '0.85rem' }}>{error}</p>
        </div>
      )}

      {/* ── SKELETON LOADER ── */}
      {loading && licitaciones.length === 0 && (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass card" style={{ height: '180px', opacity: 0.5, animation: 'pulse 1.5s ease infinite' }}>
              <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', marginBottom: '1rem', width: '40%' }} />
              <div style={{ height: '16px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', marginBottom: '0.5rem' }} />
              <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', width: '70%' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── CONTENIDO POR TAB ── */}
      {(!loading || licitaciones.length > 0) && (
        <main>

          {/* ── TAB: LICITACIONES ── */}
          {activeTab === 'licitaciones' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="section-title" style={{ margin: 0 }}>
                  <h2>{modoFiltroFecha === 'hoy' ? 'Licitaciones de Hoy' : 'Licitaciones del Rango'}</h2>
                  <span className="badge badge-blue">
                    {licitacionesFiltradas.length} de {licitaciones.length}
                  </span>
                </div>
                {activeTab === 'licitaciones' && (
                  <input
                    type="text"
                    placeholder="Buscador rápido..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'rgba(30,41,59,0.8)',
                      color: 'white', width: '220px', fontSize: '0.8rem', outline: 'none',
                    }}
                  />
                )}
              </div>

              {licitacionesFiltradas.length === 0 ? (
                <div className="glass card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</p>
                  <p style={{ color: 'var(--text-alt)', fontSize: '0.95rem' }}>
                    No se encontraron licitaciones con los filtros actuales.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  {Object.entries(agrupaciones).map(([nombreGrupo, lista]) => (
                    <div key={nombreGrupo}>
                      {agruparPor !== 'sin' && (
                        <h3 style={{
                          fontSize: '1rem', color: '#a78bfa', marginBottom: '1rem',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          borderBottom: '1px solid rgba(255,255,255,0.05)', pb: '0.5rem',
                          paddingBottom: '0.5rem'
                        }}>
                          📁 {nombreGrupo} <span style={{
                            fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-alt)', padding: '0.1rem 0.5rem', borderRadius: '999px'
                          }}>{lista.length}</span>
                        </h3>
                      )}
                      <div className="grid">
                        {lista.map((l, i) => (
                          <LicitacionCard key={l.CodigoLicitacion || i} licitacion={l} onCopyId={copiarId} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── TAB: ANALÍTICA ── */}
          {activeTab === 'analitica' && (
            <>
              <div className="section-title" style={{ marginBottom: '2rem' }}>
                <h2>Analítica de Mercado</h2>
                <span className="badge badge-blue">{licitacionesFiltradas.length} licitaciones</span>
              </div>
              <AnalyticsView licitaciones={licitacionesFiltradas} />
            </>
          )}

          {/* ── TAB: RECOMENDADOR IA ── */}
          {activeTab === 'recomendador' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Configuración de Perfil */}
              <div className="glass card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>🤖 Recomendador Inteligente</h3>
                  <p style={{ color: 'var(--text-alt)', fontSize: '0.85rem' }}>
                    Describe el perfil comercial de tu empresa y cuáles son tus productos o servicios clave. La IA analizará la lista de licitaciones vigentes y seleccionará las mejores oportunidades para ti.
                  </p>
                </div>

                <textarea
                  placeholder="Ej: Somos una empresa dedicada al desarrollo de software a medida, consultoría en tecnologías de la información, soporte informático y venta de licenciamiento tecnológico corporativo."
                  value={perfilEmpresa}
                  onChange={e => handlePerfilChange(e.target.value)}
                  style={{
                    width: '100%', height: '100px', padding: '0.85rem', borderRadius: '10px',
                    border: '1px solid var(--border)', background: 'var(--bg-dark)',
                    color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit', lineHeight: '1.4'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-alt)' }}>
                    Se analiza sobre el listado actual ({licitaciones.length} licitaciones).
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={analizarConIA}
                    disabled={loadingIA || licitaciones.length === 0}
                  >
                    {loadingIA ? (
                      <><div className="loading-spinner" />&nbsp;Analizando con IA...</>
                    ) : (
                      '✨ Analizar Oportunidades'
                    )}
                  </button>
                </div>
              </div>

              {/* Resultados */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Oportunidades Seleccionadas</h3>

                {loadingIA && recomendaciones.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px' }} />
                    <p style={{ color: 'var(--text-alt)', fontSize: '0.9rem' }}>La IA está procesando las licitaciones una a una...</p>
                  </div>
                )}

                {recomendaciones.length === 0 && !loadingIA ? (
                  <div className="glass card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💡</p>
                    <p style={{ color: 'var(--text-alt)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto' }}>
                      Ingresa el perfil de tu empresa y presiona "Analizar Oportunidades" para generar las sugerencias automáticas.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {recomendaciones.map((r, i) => {
                      const matchConfig = r.Match === 'Alto'
                        ? { color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' }
                        : r.Match === 'Medio'
                          ? { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' }
                          : { color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' }

                      return (
                        <div
                          key={r.CodigoLicitacion || i}
                          className="glass card"
                          style={{
                            padding: '1.5rem', borderRadius: '16px',
                            borderLeft: `4px solid ${matchConfig.color}`,
                            background: matchConfig.bg, borderColor: matchConfig.border,
                            display: 'grid', gridTemplateColumns: '1fr', gap: '1rem',
                            animation: 'slideIn 0.3s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <span
                                className="badge badge-orange"
                                style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.72rem', marginRight: '0.5rem' }}
                                onClick={() => copiarId(r.CodigoLicitacion)}
                              >
                                {r.CodigoLicitacion} 📋
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-alt)' }}>{r.Organismo}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                                background: matchConfig.color + '22', color: matchConfig.color
                              }}>
                                MATCH {r.Match}
                              </span>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>
                                {r.Score}% Match
                              </span>
                            </div>
                          </div>

                          <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 600 }}>{r.Nombre}</h3>

                          <div style={{
                            background: 'rgba(15,23,42,0.4)', padding: '0.85rem 1rem', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem', lineHeight: '1.4'
                          }}>
                            <strong style={{ color: 'var(--text-main)' }}>Análisis IA:</strong> {r.Justificacion}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-alt)', paddingTop: '0.5rem' }}>
                            <span>Monto: <strong style={{ color: 'var(--success)' }}>{formatMonto(r.MontoPesos) || 'No especificado'}</strong></span>
                            <span>Cierre: <strong>{formatFecha(r.FechaCierre)}</strong></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-alt)', fontSize: '0.75rem' }}>
          Datos obtenidos desde{' '}
          <a href="https://api.mercadopublico.cl" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            api.mercadopublico.cl
          </a>
          {' '}· Nata de Mercado Público
        </p>
      </footer>
    </div>
  )
}
