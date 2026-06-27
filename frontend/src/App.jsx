import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

// Mapa de códigos de estado de la API a etiquetas legibles
const ESTADO_LABEL = {
  '5': 'Publicada',
  '6': 'Cerrada',
  '7': 'Desierta',
  '8': 'Adjudicada',
  '18': 'Revocada',
}

const ESTADO_COLOR = {
  '5': { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
  '6': { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
  '7': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
  '8': { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  '18': { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' },
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
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  } catch {
    return fechaStr
  }
}

function hoyFormatted() {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE BADGE DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ codigo }) {
  const label = ESTADO_LABEL[String(codigo)] || `Estado ${codigo}`
  const style = ESTADO_COLOR[String(codigo)] || { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' }
  return (
    <span style={{
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background: style.bg,
      color: style.color,
    }}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE TARJETA DE LICITACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function LicitacionCard({ licitacion, onCopyId }) {
  const l = licitacion
  const monto = formatMonto(l.MontoPesos)

  return (
    <div className="glass card card-hover">
      {/* Fila superior: ID copiable + estado */}
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

      {/* Nombre */}
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', lineHeight: '1.4', fontWeight: 600 }}>
        {l.Nombre || 'Sin nombre'}
      </h3>

      {/* Organismo */}
      <p style={{ color: 'var(--text-alt)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <span>🏢</span> {l.Organismo || '—'}
      </p>

      {/* Tipo de licitación */}
      {l.Tipo && (
        <p style={{ color: 'var(--text-alt)', fontSize: '0.75rem', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--text-main)' }}>Tipo:</strong> {l.Tipo}
        </p>
      )}

      {/* Footer: monto y fecha de cierre */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 'auto', paddingTop: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.06)'
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

function App() {
  const [licitaciones, setLicitaciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cantidad, setCantidad] = useState(0)
  const [toast, setToast] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  // Carga automática al montar la app
  useEffect(() => {
    cargarLicitacionesHoy()
  }, [])

  const mostrarToast = (msg, tipo = 'info') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Fetch principal: licitaciones de hoy desde la API Oficial ──────────────
  const cargarLicitacionesHoy = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mp/licitaciones/hoy')
      const data = await res.json()

      if (!res.ok || data.status === 'error') {
        throw new Error(data.mensaje || `Error HTTP ${res.status}`)
      }

      setLicitaciones(data.Listado || [])
      setCantidad(data.Cantidad || 0)
      mostrarToast(`✅ ${data.Cantidad} licitaciones cargadas`, 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Copiar ID al portapapeles ──────────────────────────────────────────────
  const copiarId = (id) => {
    if (!id) return
    navigator.clipboard.writeText(id)
    mostrarToast(`📋 ID copiado: ${id}`, 'copy')
  }

  // ── Filtrado por búsqueda ──────────────────────────────────────────────────
  const licitacionesFiltradas = licitaciones.filter(l => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      (l.Nombre || '').toLowerCase().includes(q) ||
      (l.Organismo || '').toLowerCase().includes(q) ||
      (l.CodigoLicitacion || '').toLowerCase().includes(q)
    )
  })

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
          {/* Buscador rápido */}
          <input
            type="text"
            placeholder="Buscar por nombre, organismo o ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'rgba(30,41,59,0.8)',
              color: 'white',
              width: '260px',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          {/* Botón actualizar */}
          <button
            className="btn btn-primary"
            onClick={cargarLicitacionesHoy}
            disabled={loading}
            id="btn-actualizar"
          >
            {loading
              ? <><div className="loading-spinner"></div> Cargando...</>
              : '🔄 Actualizar'}
          </button>
        </div>
      </header>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 1000,
          padding: '0.9rem 1.4rem',
          borderRadius: '12px',
          background: toast.tipo === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
          border: `1px solid ${toast.tipo === 'success' ? 'rgba(52,211,153,0.4)' : 'rgba(139,92,246,0.4)'}`,
          color: 'var(--text-main)',
          fontSize: '0.85rem',
          fontWeight: 500,
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
          {error.includes('ticket') || error.includes('401') ? (
            <p style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              💡 Verifica que <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>MERCADO_PUBLICO_TICKET</code> esté configurado en el archivo <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>.env</code> del backend.
            </p>
          ) : null}
        </div>
      )}

      {/* ── ESTADO DE CARGA: SKELETON ── */}
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

      {/* ── CONTENIDO PRINCIPAL ── */}
      {!loading || licitaciones.length > 0 ? (
        <main>
          {/* Título de sección con conteo */}
          <div className="section-title">
            <h2>Licitaciones de Hoy</h2>
            <span className="badge badge-blue">
              {busqueda ? `${licitacionesFiltradas.length} / ${cantidad}` : cantidad}
            </span>
            {busqueda && licitacionesFiltradas.length === 0 && (
              <span style={{ color: 'var(--text-alt)', fontSize: '0.85rem' }}>— Sin resultados para "{busqueda}"</span>
            )}
          </div>

          {/* Grid de tarjetas */}
          {licitacionesFiltradas.length === 0 && !loading ? (
            <div className="glass card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</p>
              <p style={{ color: 'var(--text-alt)', fontSize: '0.95rem' }}>
                {busqueda
                  ? 'No se encontraron licitaciones con ese criterio.'
                  : 'No hay licitaciones publicadas hoy aún. Intenta actualizar más tarde.'}
              </p>
            </div>
          ) : (
            <div className="grid">
              {licitacionesFiltradas.map((l, i) => (
                <LicitacionCard key={l.CodigoLicitacion || i} licitacion={l} onCopyId={copiarId} />
              ))}
            </div>
          )}
        </main>
      ) : null}

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

export default App
