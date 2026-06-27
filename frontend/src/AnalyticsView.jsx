import { useState, useMemo } from 'react'
import { calcularAnaliticaOperacion, calcularAnaliticaCompetencia } from './analytics.js'
import {
  KpiCard, PieChartCard, BarChartCard,
  AreaChartCard, BarChartVertical, RankingTable,
} from './Charts.jsx'

// ── Sección header reutilizable ───────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span>{icon}</span> {title}
      </h3>
      {subtitle && <p style={{ color: 'var(--text-alt)', fontSize: '0.82rem' }}>{subtitle}</p>}
    </div>
  )
}

// ── Grid helpers ──────────────────────────────────────────────────────────────
function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>{children}</div>
}

function Grid4({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>{children}</div>
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALÍTICA DE OPERACIÓN
// ─────────────────────────────────────────────────────────────────────────────
function OperacionView({ datos }) {
  const { kpis, distribucionEstado, distribucionTipo, distribucionHora, distribucionMonto } = datos

  return (
    <div>
      {/* KPIs operacionales */}
      <SectionHeader
        icon="⚙️"
        title="Métricas Operacionales"
        subtitle="Resumen del movimiento de licitaciones publicadas hoy"
      />
      <Grid4>
        <KpiCard icon="📋" label="Total licitaciones" value={kpis.total} color="#8b5cf6" />
        <KpiCard icon="💰" label="Monto total estimado" value={kpis.montoTotal || 'N/D'} sub="suma de montos declarados" color="#34d399" />
        <KpiCard icon="📊" label="Monto promedio" value={kpis.montoPromedio || 'N/D'} sub="solo licitaciones con monto" color="#60a5fa" />
        <KpiCard icon="🏆" label="Mayor monto" value={kpis.montoMaximo || 'N/D'} color="#fbbf24" />
      </Grid4>
      <Grid4>
        <KpiCard icon="✅" label="Con monto declarado" value={kpis.conMonto} sub={`${((kpis.conMonto / kpis.total) * 100).toFixed(0)}% del total`} color="#34d399" />
        <KpiCard icon="❓" label="Sin monto" value={kpis.sinMonto} sub="no declararon monto estimado" color="#f87171" />
      </Grid4>

      {/* Distribución por estado */}
      <SectionHeader
        icon="🚦"
        title="Distribución por Estado"
        subtitle="¿En qué fase se encuentran las licitaciones de hoy?"
      />
      <Grid2>
        <PieChartCard title="Por estado" data={distribucionEstado} />
        <BarChartVertical
          title="Cantidad por estado"
          data={distribucionEstado}
          xKey="name" yKey="value"
          formatter={v => `${v}`}
        />
      </Grid2>

      {/* Timeline horario */}
      {distribucionHora.length > 0 && (
        <>
          <SectionHeader
            icon="🕐"
            title="Timeline de Publicaciones"
            subtitle="Distribución horaria de publicaciones durante el día"
          />
          <div style={{ marginBottom: '1.75rem' }}>
            <AreaChartCard
              title="Publicaciones por hora"
              data={distribucionHora}
              xKey="hora" yKey="count"
              color="#8b5cf6"
            />
          </div>
        </>
      )}

      {/* Tipo y monto */}
      <SectionHeader icon="📁" title="Segmentación por Tipo y Monto" />
      <Grid2>
        <BarChartVertical
          title="Tipos de licitación (top 8)"
          data={distribucionTipo}
          xKey="name" yKey="value"
          formatter={v => `${v}`}
        />
        <PieChartCard title="Rangos de monto estimado" data={distribucionMonto} />
      </Grid2>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALÍTICA DE COMPETENCIA
// ─────────────────────────────────────────────────────────────────────────────
function CompetenciaView({ datos }) {
  const { mercado, oportunidades, rankingOrganismos, rankingPorMonto, oportunidadesPorTipo } = datos

  return (
    <div>
      {/* KPIs de mercado */}
      <SectionHeader
        icon="🏛️"
        title="Estructura del Mercado"
        subtitle="Concentración y competitividad del mercado público de hoy"
      />
      <Grid4>
        <KpiCard icon="🏢" label="Organismos activos" value={mercado.totalOrganismos} sub="distintos compradores hoy" color="#8b5cf6" />
        <KpiCard icon="📐" label="Concentración 50%" value={`${mercado.organismos50pct} org.`} sub="concentran el 50% de licitaciones" color="#f87171" />
        <KpiCard icon="📈" label="Licitaciones por org." value={mercado.ratioLicitacionesPorOrganismo} sub="promedio" color="#60a5fa" />
        <KpiCard icon="🎯" label="Oportunidades activas" value={`${oportunidades.total}`} sub={`${oportunidades.pct}% del total · ${oportunidades.montoTotal || 'N/D'}`} color="#34d399" />
      </Grid4>

      {/* Oportunidades */}
      <SectionHeader
        icon="🎯"
        title="Oportunidades de Negocio"
        subtitle="Licitaciones en estado Publicada disponibles para postular"
      />
      <Grid2>
        <PieChartCard
          title="Oportunidades por tipo"
          data={oportunidadesPorTipo.map((d, i) => ({ ...d, fill: ['#34d399', '#60a5fa', '#8b5cf6', '#fbbf24', '#f87171', '#a78bfa'][i] }))}
        />
        <div className="glass card" style={{ padding: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Resumen de Oportunidades
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {oportunidadesPorTipo.map((o, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-alt)', fontSize: '0.85rem' }}>{o.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${o.pct}%`, height: '100%', background: '#34d399', borderRadius: '3px' }} />
                  </div>
                  <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.85rem', width: '30px', textAlign: 'right' }}>
                    {o.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Grid2>

      {/* Ranking de organismos por cantidad */}
      <SectionHeader
        icon="🏆"
        title="Ranking de Compradores"
        subtitle="Organismos con mayor actividad de compra pública hoy"
      />
      <div style={{ marginBottom: '1.75rem' }}>
        <BarChartCard
          title="Top 10 organismos por cantidad de licitaciones"
          data={rankingOrganismos.map(r => ({ nombre: r.nombre, cantidad: r.cantidad }))}
          xKey="cantidad" yKey="nombre"
          color="#8b5cf6"
          formatter={v => `${v}`}
        />
      </div>

      {/* Ranking por monto */}
      {rankingPorMonto.some(r => r.monto > 0) && (
        <>
          <SectionHeader
            icon="💰"
            title="Ranking por Volumen Financiero"
            subtitle="Organismos con mayor monto total estimado en licitaciones (en millones CLP)"
          />
          <div style={{ marginBottom: '1.75rem' }}>
            <BarChartCard
              title="Top 8 organismos por monto total (MM$)"
              data={rankingPorMonto.filter(r => r.monto > 0)}
              xKey="monto" yKey="nombre"
              color="#34d399"
              formatter={v => `$${v}M`}
            />
          </div>
        </>
      )}

      {/* Tabla detallada */}
      <SectionHeader icon="📋" title="Tabla Detallada de Organismos" />
      <RankingTable
        title="Top 10 organismos compradores"
        rows={rankingOrganismos}
        columns={[
          { key: 'nombre', label: 'Organismo', highlight: true },
          { key: 'cantidad', label: 'Licitaciones', align: 'center', bold: true },
          { key: 'pct', label: '% del total', align: 'center', render: v => `${v}%` },
          { key: 'montoTotal', label: 'Monto total', align: 'right', bold: true },
        ]}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA PRINCIPAL DE ANALÍTICA
// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsView({ licitaciones }) {
  const [tab, setTab] = useState('operacion')

  const operacion = useMemo(
    () => calcularAnaliticaOperacion(licitaciones),
    [licitaciones]
  )
  const competencia = useMemo(
    () => calcularAnaliticaCompetencia(licitaciones),
    [licitaciones]
  )

  if (!licitaciones || licitaciones.length === 0) {
    return (
      <div className="glass card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</p>
        <p style={{ color: 'var(--text-alt)' }}>
          Carga las licitaciones del día para ver la analítica.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs: Operación / Competencia */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(30,41,59,0.6)', padding: '0.35rem', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--border)' }}>
        {[
          { id: 'operacion', label: '⚙️ Operación' },
          { id: 'competencia', label: '🏛️ Competencia' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              transition: 'all 0.2s',
              background: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-alt)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'operacion' && operacion && <OperacionView datos={operacion} />}
      {tab === 'competencia' && competencia && <CompetenciaView datos={competencia} />}
    </div>
  )
}


