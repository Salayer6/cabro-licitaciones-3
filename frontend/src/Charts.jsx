import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts'
import { ESTADO_COLOR } from './analytics.js'

// ── Paleta de colores para gráficos ──────────────────────────────────────────
const PALETTE = ['#8b5cf6', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#38bdf8']

// ── Custom Tooltip reutilizable ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      fontSize: '0.82rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {label && <p style={{ color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || '#f8fafc' }}>
          {p.name}: <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Componente KPI Card ───────────────────────────────────────────────────────
export function KpiCard({ icon, label, value, sub, color = '#8b5cf6' }) {
  return (
    <div className="glass card" style={{
      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{
        fontSize: '1.8rem', width: '48px', height: '48px',
        background: `${color}22`, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ color: 'var(--text-alt)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2 }}>{value ?? '—'}</p>
        {sub && <p style={{ color: 'var(--text-alt)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Gráfico de Torta (Estado / Tipo) ─────────────────────────────────────────
export function PieChartCard({ title, data, dataKey = 'value', nameKey = 'name' }) {
  const fills = data.map((d, i) => d.fill || PALETTE[i % PALETTE.length])
  return (
    <div className="glass card" style={{ padding: '1.5rem' }}>
      <h4 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={60} outerRadius={90}
            paddingAngle={3}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={fills[i]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={v => `${v} licitaciones`} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v, entry) => (
              <span style={{ color: 'var(--text-alt)', fontSize: '0.78rem' }}>
                {v} <strong style={{ color: 'var(--text-main)' }}>({entry.payload.pct}%)</strong>
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Gráfico de Barras horizontal (Organismos) ─────────────────────────────────
export function BarChartCard({ title, data, xKey, yKey, color = '#8b5cf6', formatter }) {
  return (
    <div className="glass card" style={{ padding: '1.5rem' }}>
      <h4 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatter} />
          <YAxis
            type="category" dataKey={yKey} width={160}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={v => v.length > 22 ? v.slice(0, 21) + '…' : v}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Bar dataKey={xKey} fill={color} radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Gráfico de Área (timeline horario) ───────────────────────────────────────
export function AreaChartCard({ title, data, xKey, yKey, color = '#8b5cf6' }) {
  return (
    <div className="glass card" style={{ padding: '1.5rem' }}>
      <h4 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ left: 0, right: 8 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip formatter={v => `${v} publicaciones`} />} />
          <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill="url(#areaGrad)" dot={{ fill: color, r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Gráfico de Barras simple (vertical) ───────────────────────────────────────
export function BarChartVertical({ title, data, xKey, yKey, formatter }) {
  return (
    <div className="glass card" style={{ padding: '1.5rem' }}>
      <h4 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => v.length > 10 ? v.slice(0, 9) + '…' : v} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={formatter} />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Tabla de ranking ──────────────────────────────────────────────────────────
export function RankingTable({ title, rows, columns }) {
  return (
    <div className="glass card" style={{ padding: '1.5rem' }}>
      <h4 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-alt)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', padding: '0.5rem', color: '#64748b', fontWeight: 600, width: '40px' }}>#</th>
              {columns.map(c => (
                <th key={c.key} style={{ textAlign: c.align || 'left', padding: '0.5rem 0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{
                borderTop: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem', color: '#64748b', fontWeight: 700 }}>
                  {i + 1}
                </td>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '0.65rem 0.75rem', color: c.highlight ? '#f8fafc' : 'var(--text-alt)', textAlign: c.align || 'left', fontWeight: c.bold ? 700 : 400 }}>
                    {c.render ? c.render(row[c.key], row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
