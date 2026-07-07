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
// TIPS EDUCATIVOS DE LA API (carrusel en el tab de licitaciones)
// ─────────────────────────────────────────────────────────────────────────────

const API_TIPS = [
  {
    icon: '📦',
    titulo: 'Ítems y productos requeridos',
    desc: 'El detalle de cada licitación expone exactamente qué pide el organismo: nombre del producto, cantidad y unidad de medida.',
    endpoint: 'GET /api/mp/licitaciones/{id}',
    campo: '→ detalle.Items[]',
    ejemplo: 'NombreProducto · Cantidad · UnidadMedida',
  },
  {
    icon: '👤',
    titulo: 'Responsable del contrato',
    desc: 'Cada ficha incluye el nombre y cargo del funcionario responsable: el contacto clave antes de postular.',
    endpoint: 'GET /api/mp/licitaciones/{id}',
    campo: '→ detalle.ResponsableContrato',
    ejemplo: '"Juan Pérez - Jefe de Adquisiciones"',
  },
  {
    icon: '📄',
    titulo: 'Descripción técnica completa',
    desc: 'La API entrega el texto largo con los requisitos técnicos específicos, ideal para evaluar factibilidad antes de postular.',
    endpoint: 'GET /api/mp/licitaciones/{id}',
    campo: '→ detalle.Descripcion',
    ejemplo: 'Texto libre con especificaciones y alcances',
  },
  {
    icon: '🗺️',
    titulo: 'Región y comuna de ejecución',
    desc: 'Ubica exactamente dónde se ejecutará el contrato. Útil para filtrar oportunidades por zona geográfica.',
    endpoint: 'GET /api/mp/licitaciones/{id}',
    campo: '→ detalle.NombreRegion · detalle.Comuna',
    ejemplo: '"Región Metropolitana · Las Condes"',
  },
  {
    icon: '📅',
    titulo: 'Análisis histórico por rango',
    desc: 'Consulta licitaciones de cualquier período pasado para detectar patrones de compra, organismos recurrentes y adjudicaciones anteriores.',
    endpoint: 'GET /api/mp/licitaciones/rango?desde=&hasta=',
    campo: '→ Cantidad · Listado[]',
    ejemplo: 'desde=2026-01-01&hasta=2026-06-30',
  },
]

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

function LicitacionCard({ licitacion, onCopyId, onVerDetalle }) {
  const l = licitacion
  const monto = formatMonto(l.MontoPesos)
  const tipo = TIPO_MAP[l.Tipo] || l.Tipo
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopyId(l.CodigoLicitacion)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="glass card card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Badge de ID con copia rápida */}
          <button
            onClick={handleCopy}
            title="Clic para copiar ID"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(249,115,22,0.15)',
              color: copied ? '#4ade80' : '#fb923c',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.35)'}`,
              borderRadius: '7px', padding: '0.2rem 0.55rem',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s', letterSpacing: '0.03em',
              fontFamily: 'monospace',
            }}
          >
            {copied ? '✓ Copiado!' : l.CodigoLicitacion || 'N/A'}
            {!copied && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>

          {/* Botón ficha detallada */}
          <button
            onClick={() => onVerDetalle(l.CodigoLicitacion)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-alt)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.65rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-alt)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            🔍 Ficha
          </button>
        </div>
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

      {/* ── BARRA DE ID + COPIA (zona de acción principal) ── */}
      <div style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        {/* Label */}
        <span style={{
          fontSize: '0.58rem', color: 'var(--text-alt)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0,
        }}>ID</span>

        {/* ID en monospace */}
        <code style={{
          fontSize: '0.73rem', color: '#fb923c', fontFamily: 'monospace',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          background: 'rgba(249,115,22,0.06)',
          border: '1px solid rgba(249,115,22,0.12)',
          borderRadius: '5px', padding: '0.15rem 0.45rem',
          letterSpacing: '0.03em',
        }}>
          {l.CodigoLicitacion || 'N/A'}
        </code>

        {/* Botón copiar prominente */}
        <button
          onClick={handleCopy}
          title={copied ? 'ID copiado al portapapeles' : 'Copiar ID de licitación'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
            background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.12)',
            color: copied ? '#4ade80' : '#fb923c',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(249,115,22,0.3)'}`,
            borderRadius: '7px', padding: '0.3rem 0.7rem',
            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = 'rgba(249,115,22,0.2)' } }}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'rgba(249,115,22,0.12)' } }}
        >
          {copied ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copiar ID
            </>
          )}
        </button>
      </div>

      {/* Hint de endpoint POST-COPIA */}
      {copied && (
        <div style={{
          marginTop: '0.4rem',
          padding: '0.45rem 0.75rem',
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.12)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          animation: 'slideIn 0.2s ease',
          flexWrap: 'wrap',
        }}>
          <code style={{ fontSize: '0.64rem', color: '#34d399', fontFamily: 'monospace', flex: 1 }}>
            GET /api/mp/licitaciones/<strong>{l.CodigoLicitacion}</strong>
          </code>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-alt)', whiteSpace: 'nowrap' }}>
            ítems · responsable · descripción
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Banner educativo de capacidades de la API (carrusel auto-rotativo)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Toggle switch reutilizable
// ─────────────────────────────────────────────────────────────────────────────

function ToggleSwitch({ on, onChange, labelOff, labelOn, descOn, descOff }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Label izquierda */}
        <span style={{
          fontSize: '0.8rem',
          color: on ? 'var(--text-alt)' : 'var(--text-main)',
          fontWeight: on ? 400 : 700,
          transition: 'all 0.2s',
        }}>
          {labelOff}
        </span>

        {/* Track */}
        <button
          onClick={() => onChange(!on)}
          style={{
            width: '48px', height: '26px', borderRadius: '13px', padding: '3px',
            background: on ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${on ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.12)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            transition: 'all 0.25s ease', flexShrink: 0,
          }}
          aria-checked={on}
          role="switch"
        >
          {/* Knob */}
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: on ? '#a78bfa' : 'rgba(255,255,255,0.45)',
            transform: on ? 'translateX(22px)' : 'translateX(0)',
            transition: 'all 0.25s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            flexShrink: 0,
          }} />
        </button>

        {/* Label derecha */}
        <span style={{
          fontSize: '0.8rem',
          color: on ? 'var(--text-main)' : 'var(--text-alt)',
          fontWeight: on ? 700 : 400,
          transition: 'all 0.2s',
        }}>
          {labelOn}
        </span>
      </div>

      {/* Descripción del modo activo */}
      {(descOn || descOff) && (
        <p style={{
          fontSize: '0.73rem',
          color: 'var(--text-alt)',
          margin: 0,
          paddingLeft: '0.1rem',
          lineHeight: '1.4',
        }}>
          {on ? descOn : descOff}
        </p>
      )}
    </div>
  )
}

function ApiTipBanner({ idCopiadoReciente }) {
  const [tipActual, setTipActual] = useState(0)
  const [visible, setVisible]     = useState(true)
  const [animando, setAnimando]   = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(() => navegar(1), 7000)
    return () => clearInterval(interval)
  }, [tipActual])

  const navegar = (dir) => {
    setAnimando(true)
    setTimeout(() => {
      setTipActual(prev => (prev + dir + API_TIPS.length) % API_TIPS.length)
      setAnimando(false)
    }, 180)
  }

  const irATip = (i) => {
    if (i === tipActual) return
    setAnimando(true)
    setTimeout(() => { setTipActual(i); setAnimando(false) }, 180)
  }

  if (!visible) return null

  const tip = API_TIPS[tipActual]

  const navBtn = (extra = {}) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '30px', borderRadius: '8px',
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.22)',
    color: '#a78bfa', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700,
    transition: 'background 0.15s', flexShrink: 0, lineHeight: 1,
    ...extra,
  })

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(59,130,246,0.05) 100%)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: '14px',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
    }}>

      {/* ── Fila de controles: badge · flex · ‹ dots › · contador · ✕ ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>

        {/* Badge */}
        <span style={{
          fontSize: '0.6rem', color: '#a78bfa', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '5px', padding: '0.15rem 0.5rem', whiteSpace: 'nowrap',
        }}>
          💡 Capacidades de la API
        </span>

        <div style={{ flex: 1 }} />

        {/* Botón anterior */}
        <button
          onClick={() => navegar(-1)}
          style={navBtn()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
          title="Anterior"
        >
          ‹
        </button>

        {/* Dots clicables */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {API_TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => irATip(i)}
              title={API_TIPS[i].titulo}
              style={{
                width: i === tipActual ? '22px' : '8px',
                height: '8px', borderRadius: '4px', border: 'none', padding: 0,
                background: i === tipActual ? '#a78bfa' : 'rgba(139,92,246,0.2)',
                cursor: 'pointer', transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Contador */}
        <span style={{
          fontSize: '0.65rem', color: 'var(--text-alt)',
          fontVariantNumeric: 'tabular-nums', minWidth: '26px', textAlign: 'center',
        }}>
          {tipActual + 1}/{API_TIPS.length}
        </span>

        {/* Botón siguiente */}
        <button
          onClick={() => navegar(1)}
          style={navBtn()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
          title="Siguiente"
        >
          ›
        </button>

        {/* Botón cerrar */}
        <button
          onClick={() => setVisible(false)}
          style={navBtn({ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-alt)', fontSize: '0.85rem' })}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-main)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-alt)' }}
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* ── Cuerpo: ícono + texto ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.9rem',
        opacity: animando ? 0 : 1, transition: 'opacity 0.18s ease',
      }}>
        {/* Ícono en píldora */}
        <span style={{
          fontSize: '1.7rem', flexShrink: 0, lineHeight: 1,
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.18)',
          borderRadius: '10px', padding: '0.35rem 0.45rem',
        }}>
          {tip.icon}
        </span>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.2rem', color: 'var(--text-main)' }}>
            {tip.titulo}
          </p>
          <p style={{ fontSize: '0.77rem', color: 'var(--text-alt)', margin: '0 0 0.55rem', lineHeight: '1.45' }}>
            {tip.desc}
          </p>

          {/* Endpoint + campo + badge ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <code style={{
              fontSize: '0.67rem', color: '#34d399',
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)',
              borderRadius: '6px', padding: '0.22rem 0.55rem', fontFamily: 'monospace',
            }}>
              {tip.endpoint}
            </code>
            <span style={{ fontSize: '0.67rem', color: '#60a5fa', fontFamily: 'monospace' }}>
              {tip.campo}
            </span>
            {idCopiadoReciente && (
              <span style={{
                fontSize: '0.63rem', color: '#fbbf24',
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: '5px', padding: '0.15rem 0.45rem', fontWeight: 600,
              }}>
                ⚡ ID listo para probar
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DATOS MOCK DE PRUEBA (Para cuando la API no tiene configurada la credencial)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_LICITACIONES = [
  {
    CodigoLicitacion: '4582-12-LQ26',
    Nombre: 'Soporte informático integral y administración de servidores para la comuna',
    Organismo: 'Ilustre Municipalidad de Las Condes',
    CodigoEstado: '5',
    MontoPesos: '68000000',
    Tipo: 'LQ',
    FechaCierre: new Date(Date.now() + 5*24*60*60*1000).toISOString(),
    FechaPublicacion: new Date().toISOString()
  },
  {
    CodigoLicitacion: '7821-3-LE26',
    Nombre: 'Adquisición de equipamiento médico y ventiladores de alta complejidad',
    Organismo: 'Servicio de Salud Metropolitano Oriente Providencia',
    CodigoEstado: '5',
    MontoPesos: '145000000',
    Tipo: 'LE',
    FechaCierre: new Date(Date.now() + 12*24*60*60*1000).toISOString(),
    FechaPublicacion: new Date().toISOString()
  },
  {
    CodigoLicitacion: '1290-44-E26',
    Nombre: 'Compra ágil de licencias de Microsoft Office 365 Pro para educación pública',
    Organismo: 'Subsecretaría de Educación Santiago Centro',
    CodigoEstado: '5',
    MontoPesos: '4800000',
    Tipo: 'E',
    FechaCierre: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
    FechaPublicacion: new Date().toISOString()
  },
  {
    CodigoLicitacion: '8912-10-LQ26',
    Nombre: 'Habilitación de redes estructuradas, fibra óptica y WiFi en campus universitario',
    Organismo: 'Universidad de Concepción',
    CodigoEstado: '5',
    MontoPesos: '55000000',
    Tipo: 'LQ',
    FechaCierre: new Date(Date.now() + 8*24*60*60*1000).toISOString(),
    FechaPublicacion: new Date().toISOString()
  },
  {
    CodigoLicitacion: '5543-9-LE26',
    Nombre: 'Servicio de consultoría y auditoría de ciberseguridad perimetral',
    Organismo: 'Tesorería General de la República Temuco',
    CodigoEstado: '6',
    MontoPesos: '12000000',
    Tipo: 'LE',
    FechaCierre: new Date(Date.now() - 1*24*60*60*1000).toISOString(),
    FechaPublicacion: new Date().toISOString()
  },
  {
    CodigoLicitacion: '2211-100-CO26',
    Nombre: 'Convenio marco para el suministro de materiales de oficina e insumos papeleros',
    Organismo: 'Dirección de Compras y Contratación Pública Valparaíso',
    CodigoEstado: '8',
    MontoPesos: '250000000',
    Tipo: 'CO',
    FechaCierre: new Date(Date.now() - 10*24*60*60*1000).toISOString(),
    FechaPublicacion: new Date().toISOString()
  }
];

const MOCK_DETALLES = {
  '4582-12-LQ26': {
    CodigoLicitacion: '4582-12-LQ26',
    Nombre: 'Soporte informático integral y administración de servidores para la comuna',
    Descripcion: 'Servicio de soporte técnico presencial y remoto, mantenimiento correctivo y preventivo de hardware y software, administración activa de servidores municipales y soporte a usuarios finales de la Municipalidad de Las Condes.',
    Organismo: 'Ilustre Municipalidad de Las Condes',
    NombreRegion: 'Región Metropolitana de Santiago',
    Comuna: 'Las Condes',
    MontoPesos: '68000000',
    Tipo: 'LQ',
    FechaPublicacion: new Date().toISOString(),
    FechaCierre: new Date(Date.now() + 5*24*60*60*1000).toISOString(),
    ResponsableContrato: 'Juan Pablo Pérez - Administrador de Sistemas',
    Items: [
      { NombreProducto: 'Servicio de Soporte TI Presencial Nivel 1', Cantidad: 4, UnidadMedida: 'Mes' },
      { NombreProducto: 'Administración de Servidores Cloud Linux/Windows', Cantidad: 2, UnidadMedida: 'Mes' },
      { NombreProducto: 'Mantenimiento Preventivo Computadores Municipales', Cantidad: 120, UnidadMedida: 'Unidad' }
    ]
  },
  '7821-3-LE26': {
    CodigoLicitacion: '7821-3-LE26',
    Nombre: 'Adquisición de equipamiento médico y ventiladores de alta complejidad',
    Descripcion: 'Adquisición y puesta en marcha de ventiladores mecánicos invasivos de alta gama, monitores multiparámetros y equipamiento complementario para la Red de Urgencia del Servicio de Salud Metropolitano Oriente.',
    Organismo: 'Servicio de Salud Metropolitano Oriente Providencia',
    NombreRegion: 'Región Metropolitana de Santiago',
    Comuna: 'Providencia',
    MontoPesos: '145000000',
    Tipo: 'LE',
    FechaPublicacion: new Date().toISOString(),
    FechaCierre: new Date(Date.now() + 12*24*60*60*1000).toISOString(),
    ResponsableContrato: 'Dra. María Elisa Gómez - Directora Médica',
    Items: [
      { NombreProducto: 'Ventilador Mecánico Invasivo Neonatal/Adulto', Cantidad: 5, UnidadMedida: 'Unidad' },
      { NombreProducto: 'Monitor Multiparámetro Nivel Avanzado', Cantidad: 8, UnidadMedida: 'Unidad' }
    ]
  },
  '1290-44-E26': {
    CodigoLicitacion: '1290-44-E26',
    Nombre: 'Compra ágil de licencias de Microsoft Office 365 Pro para educación pública',
    Descripcion: 'Adquisición directa mediante Compra Ágil de licenciamiento anual educativo de Microsoft Office 365 Pro para alumnos y docentes de establecimientos educacionales de la comuna de Santiago.',
    Organismo: 'Subsecretaría de Educación Santiago Centro',
    NombreRegion: 'Región Metropolitana de Santiago',
    Comuna: 'Santiago Centro',
    MontoPesos: '4800000',
    Tipo: 'E',
    FechaPublicacion: new Date().toISOString(),
    FechaCierre: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
    ResponsableContrato: 'Carlos Soto - Jefe de Informática Educación',
    Items: [
      { NombreProducto: 'Suscripción Anual Microsoft 365 A3 Docentes', Cantidad: 150, UnidadMedida: 'Licencia' },
      { NombreProducto: 'Suscripción Anual Microsoft 365 A3 Alumnos', Cantidad: 500, UnidadMedida: 'Licencia' }
    ]
  },
  '8912-10-LQ26': {
    CodigoLicitacion: '8912-10-LQ26',
    Nombre: 'Habilitación de redes estructuradas, fibra óptica y WiFi en campus universitario',
    Descripcion: 'Servicio de diseño, canalización, cableado estructurado Categoría 6A, tendido de fibra óptica multimodo y configuración de puntos de acceso inalámbricos en los pabellones de Ingeniería de la Universidad de Concepción.',
    Organismo: 'Universidad de Concepción',
    NombreRegion: 'Región del Bío Bío',
    Comuna: 'Concepción',
    MontoPesos: '55000000',
    Tipo: 'LQ',
    FechaPublicacion: new Date().toISOString(),
    FechaCierre: new Date(Date.now() + 8*24*60*60*1000).toISOString(),
    ResponsableContrato: 'Ing. Pedro Ramírez - Director de Infraestructura Digital',
    Items: [
      { NombreProducto: 'Cableado estructurado Cat6A por punto de red', Cantidad: 180, UnidadMedida: 'Punto' },
      { NombreProducto: 'Puntos de Acceso WiFi 6 Empresariales', Cantidad: 24, UnidadMedida: 'Unidad' },
      { NombreProducto: 'Fibra Óptica Multimodo OM4 instalada (metros)', Cantidad: 850, UnidadMedida: 'Metro' }
    ]
  },
  '5543-9-LE26': {
    CodigoLicitacion: '5543-9-LE26',
    Nombre: 'Servicio de consultoría y auditoría de ciberseguridad perimetral',
    Descripcion: 'Análisis de vulnerabilidades, pruebas de penetración (pentesting) externas e internas, y auditoría de políticas de firewall de la Tesorería General de la República en su dirección regional de La Araucanía.',
    Organismo: 'Tesorería General de la República Temuco',
    NombreRegion: 'Región de La Araucanía',
    Comuna: 'Temuco',
    MontoPesos: '12000000',
    Tipo: 'LE',
    FechaPublicacion: new Date().toISOString(),
    FechaCierre: new Date(Date.now() - 1*24*60*60*1000).toISOString(),
    ResponsableContrato: 'Sofía Valenzuela - Encargada de Seguridad de la Información',
    Items: [
      { NombreProducto: 'Servicio de Pentesting Externo / Caja Negra', Cantidad: 1, UnidadMedida: 'Global' },
      { NombreProducto: 'Auditoría de Configuración e Reglas de Firewall', Cantidad: 1, UnidadMedida: 'Global' }
    ]
  },
  '2211-100-CO26': {
    CodigoLicitacion: '2211-100-CO26',
    Nombre: 'Convenio marco para el suministro de materiales de oficina e insumos papeleros',
    Descripcion: 'Licitación pública de convenio marco nacional para la provisión continua de artículos de escritorio, carpetas, lápices y resmas de papel para todas las entidades gubernamentales del país.',
    Organismo: 'Dirección de Compras y Contratación Pública Valparaíso',
    NombreRegion: 'Región de Valparaíso',
    Comuna: 'Valparaíso',
    MontoPesos: '250000000',
    Tipo: 'CO',
    FechaPublicacion: new Date().toISOString(),
    FechaCierre: new Date(Date.now() - 10*24*60*60*1000).toISOString(),
    ResponsableContrato: 'Alejandro Tapia - Jefe Convenios Marco',
    Items: [
      { NombreProducto: 'Resma de Papel Multipropósito Carta 75g', Cantidad: 5000, UnidadMedida: 'Resma' },
      { NombreProducto: 'Resma de Papel Multipropósito Oficio 75g', Cantidad: 3000, UnidadMedida: 'Resma' }
    ]
  }
};

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
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Consulta por ID y Ficha
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [busquedaId, setBusquedaId] = useState('')

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
  const [mostrarFiltros, setMostrarFiltros] = useState(true) // Expandido por defecto

  // Banner educativo: indica que hay un ID copiado recientemente
  const [idCopiadoReciente, setIdCopiadoReciente] = useState(false)

  // IA Recomendador
  const [perfilEmpresa, setPerfilEmpresa] = useState(() => {
    return localStorage.getItem('perfil_empresa') || ''
  })
  // false = motor heurístico local (sin tokens) | true = Gemini IA (consume tokens)
  const [usarIA, setUsarIA] = useState(false)
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
    setIsDemoMode(false)
    try {
      const res  = await fetch('/api/mp/licitaciones/hoy')
      const data = await res.json()
      if (!res.ok || data.status === 'error') throw new Error(data.mensaje || `Error HTTP ${res.status}`)

      const listado = data.Listado || []

      // Si hoy no tiene licitaciones (fuera de horario hábil), cargamos automáticamente ayer
      if (listado.length === 0) {
        const ayer = new Date()
        ayer.setDate(ayer.getDate() - 1)
        const ayerStr = ayer.toISOString().split('T')[0]
        const resAyer = await fetch(`/api/mp/licitaciones/rango?desde=${ayerStr}&hasta=${ayerStr}`)
        const dataAyer = await resAyer.json()
        if (resAyer.ok && dataAyer.status !== 'error' && (dataAyer.Listado || []).length > 0) {
          setLicitaciones(dataAyer.Listado)
          setModoFiltroFecha('rango')
          setFechaDesde(ayerStr)
          setFechaHasta(ayerStr)
          mostrarToast(`📅 Sin publicaciones hoy — mostrando ${dataAyer.Cantidad} licitaciones de ayer`, 'info')
          return
        }
      }

      setLicitaciones(listado)
      mostrarToast(`✅ ${data.Cantidad} licitaciones cargadas`, 'success')
    } catch (err) {
      setError(err.message)
      setLicitaciones(MOCK_LICITACIONES)
      setIsDemoMode(true)
      mostrarToast('⚡ Usando licitaciones de prueba (Modo Demostración)', 'info')
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
    setIsDemoMode(false)
    try {
      const res = await fetch(`/api/mp/licitaciones/rango?desde=${fechaDesde}&hasta=${fechaHasta}`)
      const data = await res.json()
      if (!res.ok || data.status === 'error') throw new Error(data.mensaje || `Error HTTP ${res.status}`)
      setLicitaciones(data.Listado || [])
      mostrarToast(`✅ ${data.Cantidad} licitaciones en el rango`, 'success')
    } catch (err) {
      setError(err.message)
      setLicitaciones(MOCK_LICITACIONES)
      setIsDemoMode(true)
      mostrarToast('⚡ Usando licitaciones de prueba (Modo Demostración)', 'info')
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
          perfilEmpresa,
          usarIA,
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

  // ── Consulta detallada de Ficha por ID (Licitación o Compra Ágil) ──────────
  
  const abrirDetalleLicitacion = async (id) => {
    if (!id) return
    setLoadingDetalle(true)
    setDetalleSeleccionado(null) // Reset anterior
    try {
      if (isDemoMode) {
        // En modo demo, buscamos en el MOCK_DETALLES o creamos uno dinámico básico
        const mock = MOCK_DETALLES[id] || {
          CodigoLicitacion: id,
          Nombre: 'Licitación de Prueba Simulada',
          Descripcion: 'Esta es una ficha técnica simulada generada automáticamente. Muestra el detalle del requerimiento público para pruebas de interfaz en modo demostración.',
          Organismo: 'Ilustre Municipalidad de Las Condes (Demo)',
          NombreRegion: 'Región Metropolitana de Santiago',
          Comuna: 'Las Condes',
          MontoPesos: '35000000',
          Tipo: 'LQ',
          FechaPublicacion: new Date().toISOString(),
          FechaCierre: new Date(Date.now() + 5*24*60*60*1000).toISOString(),
          ResponsableContrato: 'Administrador de Pruebas TI',
          Items: [
            { NombreProducto: 'Soporte y Consultoría Tecnológica Estándar', Cantidad: 1, UnidadMedida: 'Global' }
          ]
        }
        setDetalleSeleccionado(mock)
      } else {
        const res = await fetch(`/api/mp/licitaciones/${encodeURIComponent(id.trim())}`)
        const data = await res.json()
        if (!res.ok || data.status === 'error') {
          throw new Error(data.mensaje || 'Error al obtener ficha de licitación.')
        }
        const detalle = data.detalle || data
        setDetalleSeleccionado(detalle)
      }
    } catch (err) {
      mostrarToast(`❌ Error al obtener detalle: ${err.message}`, 'error')
    } finally {
      setLoadingDetalle(false)
    }
  }

  const buscarPorIdDirecto = () => {
    if (!busquedaId.trim()) {
      mostrarToast('⚠️ Ingresa un ID de licitación o compra ágil', 'warning')
      return
    }
    abrirDetalleLicitacion(busquedaId.trim())
    setBusquedaId('')
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
    // Fallback para contextos sin permisos de clipboard (HTTP no seguro)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).catch(() => copiarIdFallback(id))
      } else {
        copiarIdFallback(id)
      }
    } catch {
      copiarIdFallback(id)
    }
    mostrarToast(`📋 ${id}`, 'success')
    // Activa el badge "tienes un ID listo" en el banner educativo por 8s
    setIdCopiadoReciente(true)
    setTimeout(() => setIdCopiadoReciente(false), 8000)
  }

  const copiarIdFallback = (id) => {
    const el = document.createElement('textarea')
    el.value = id
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
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

      {/* ── BANNER MODO DEMOSTRACIÓN ── */}
      {isDemoMode && (
        <div className="glass card" style={{
          marginBottom: '2rem', padding: '1rem 1.5rem',
          background: 'rgba(59, 130, 246, 0.08)',
          borderLeft: '4px solid #60a5fa',
          borderColor: 'rgba(59, 130, 246, 0.3)',
          animation: 'slideIn 0.3s ease'
        }}>
          <p style={{ fontSize: '0.85rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>⚡</span> <strong>Modo Demostración Activo:</strong> El servidor no tiene configurado su credencial (<code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>MERCADO_PUBLICO_TICKET</code>). Hemos cargado licitaciones de prueba para que puedas comprobar interactivamente los filtros avanzados de comunas (multiciudad), la agrupación por organismo y el recomendador con IA.
          </p>
        </div>
      )}

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
              {/* Banner educativo de capacidades de la API */}
              <ApiTipBanner idCopiadoReciente={idCopiadoReciente} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="section-title" style={{ margin: 0 }}>
                  <h2>{modoFiltroFecha === 'hoy' ? 'Licitaciones de Hoy' : 'Licitaciones del Rango'}</h2>
                  <span className="badge badge-blue">
                    {licitacionesFiltradas.length} de {licitaciones.length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Buscar por ID directo */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      type="text"
                      placeholder="ID licitación o compra ágil..."
                      value={busquedaId}
                      onChange={e => setBusquedaId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && buscarPorIdDirecto()}
                      style={{
                        padding: '0.5rem 0.9rem', borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'rgba(30,41,59,0.8)',
                        color: 'white', width: '200px', fontSize: '0.78rem', outline: 'none',
                      }}
                    />
                    <button
                      onClick={buscarPorIdDirecto}
                      disabled={loadingDetalle}
                      style={{
                        padding: '0.5rem 0.75rem', borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'rgba(139,92,246,0.15)',
                        color: '#a78bfa', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700
                      }}
                    >
                      {loadingDetalle ? '...' : '🔍'}
                    </button>
                  </div>
                  {/* Buscador rápido de texto */}
                  <input
                    type="text"
                    placeholder="Buscador rápido..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'rgba(30,41,59,0.8)',
                      color: 'white', width: '180px', fontSize: '0.8rem', outline: 'none',
                    }}
                  />
                </div>
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
                          <LicitacionCard key={l.CodigoLicitacion || i} licitacion={l} onCopyId={copiarId} onVerDetalle={abrirDetalleLicitacion} />
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

                {/* ── Toggle IA / Heurístico ── */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  flexWrap: 'wrap', gap: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <ToggleSwitch
                      on={usarIA}
                      onChange={setUsarIA}
                      labelOff="🔧 Heurístico"
                      labelOn="✨ IA Gemini"
                      descOff={`Motor local de palabras clave · sin costo de tokens · ${licitaciones.length} licitaciones a analizar`}
                      descOn={`Gemini 1.5 Flash · análisis semántico profundo · consume tokens API · ${licitaciones.length} licitaciones a analizar`}
                    />
                    {/* Badge de advertencia de costo cuando IA está ON */}
                    {usarIA && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        borderRadius: '7px', padding: '0.3rem 0.7rem',
                        fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600,
                        width: 'fit-content',
                        animation: 'slideIn 0.2s ease',
                      }}>
                        ⚠️ Cada análisis llama a la API de Gemini. Usa con criterio.
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={analizarConIA}
                    disabled={loadingIA || licitaciones.length === 0}
                    style={{ flexShrink: 0, alignSelf: 'flex-end' }}
                  >
                    {loadingIA ? (
                      <><div className="loading-spinner" />&nbsp;{usarIA ? 'Consultando Gemini...' : 'Analizando...'}</>
                    ) : (
                      usarIA ? '✨ Analizar con IA' : '🔧 Analizar con Heurístico'
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

      {/* ── MODAL DE FICHA DE LICITACIÓN ── */}
      {detalleSeleccionado && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', animation: 'slideIn 0.25s ease'
          }}
          onClick={e => { if (e.target === e.currentTarget) setDetalleSeleccionado(null) }}
        >
          <div style={{
            width: '100%', maxWidth: '720px', maxHeight: '88vh', overflowY: 'auto',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
            border: '1px solid rgba(139,92,246,0.3)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            padding: '2rem'
          }}>
            {/* Cabecera del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                      padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                      letterSpacing: '0.04em', cursor: 'pointer'
                    }}
                    onClick={() => copiarId(detalleSeleccionado.CodigoLicitacion)}
                    title="Clic para copiar"
                  >
                    {detalleSeleccionado.CodigoLicitacion} 📋
                  </span>
                  <EstadoBadge codigo={detalleSeleccionado.CodigoEstado || '5'} />
                  {detalleSeleccionado.Tipo && (
                    <span style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {TIPO_MAP[detalleSeleccionado.Tipo] || detalleSeleccionado.Tipo}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
                  {detalleSeleccionado.Nombre}
                </h2>
              </div>
              <button
                onClick={() => setDetalleSeleccionado(null)}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white',
                  width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                  fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginLeft: '1rem'
                }}
              >
                ×
              </button>
            </div>

            {/* Descripción */}
            {detalleSeleccionado.Descripcion && (
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-alt)', lineHeight: 1.55, margin: 0 }}>
                  {detalleSeleccionado.Descripcion}
                </p>
              </div>
            )}

            {/* Metadatos en grilla */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: '🏢 Organismo', value: detalleSeleccionado.Organismo },
                { label: '📍 Región / Comuna', value: [detalleSeleccionado.NombreRegion, detalleSeleccionado.Comuna].filter(Boolean).join(' — ') },
                { label: '💰 Monto Estimado', value: formatMonto(detalleSeleccionado.MontoPesos) || 'No especificado' },
                { label: '📅 Publicación', value: formatFecha(detalleSeleccionado.FechaPublicacion) },
                { label: '⏰ Cierre de Ofertas', value: formatFecha(detalleSeleccionado.FechaCierre) },
                { label: '👤 Responsable', value: detalleSeleccionado.ResponsableContrato },
              ].filter(m => m.value).map((m, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-alt)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{m.label}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, margin: 0 }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* ÍTEMS / PRODUCTOS */}
            {detalleSeleccionado.Items && detalleSeleccionado.Items.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  📦 Ítems Requeridos
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detalleSeleccionado.Items.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.65rem 1rem',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {item.Correlativo && <span style={{ color: 'var(--text-alt)', marginRight: '0.4rem' }}>#{item.Correlativo}</span>}
                        {item.NombreProducto || item.NombreEspanol || 'Producto sin nombre'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                        {item.Cantidad} {item.UnidadMedida}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón de cierre inferior */}
            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <a
                href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${detalleSeleccionado.CodigoLicitacion}`}
                target="_blank" rel="noreferrer"
                style={{
                  padding: '0.55rem 1.2rem', borderRadius: '10px',
                  background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                  border: '1px solid rgba(139,92,246,0.3)', textDecoration: 'none',
                  fontSize: '0.85rem', fontWeight: 600
                }}
              >
                🔗 Ver en Mercado Público
              </a>
              <button
                onClick={() => setDetalleSeleccionado(null)}
                style={{
                  padding: '0.55rem 1.4rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 700
                }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
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
