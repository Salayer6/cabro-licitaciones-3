import { useState, useEffect } from 'react'

function App() {
  const [licitaciones, setLicitaciones] = useState([])
  const [comprasAgiles, setComprasAgiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [cookieInput, setCookieInput] = useState('')
  const [status, setStatus] = useState('')

  const fetchTenders = async () => {
    try {
      const resLicitaciones = await fetch('/api/licitaciones')
      const dataLicitaciones = await resLicitaciones.json()
      setLicitaciones(dataLicitaciones)

      const resCompras = await fetch('/api/compras-agiles')
      const dataCompras = await resCompras.json()
      setComprasAgiles(dataCompras)
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  useEffect(() => {
    fetchTenders()
  }, [])

  const startLogin = async () => {
    setLoading(true)
    setStatus('Iniciando navegador para ClaveÚnica...')
    try {
      const res = await fetch('/api/auth/login', { method: 'POST' })
      const data = await res.json()
      if (data.status === 'success') {
        setStatus('Autenticación guardada con éxito.')
        setTimeout(() => setStatus(''), 3000)
      }
    } catch (err) {
      setStatus('Error al autenticar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startScan = async () => {
    setScanning(true)
    setStatus('Escaneando Mercado Público...')
    try {
      const res = await fetch('/api/scan', { method: 'POST' })
      const text = await res.text()
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Respuesta no es JSON: ${text.substring(0, 100)}...`);
      }
      
      if (data.status === 'success') {
        setStatus(`Escaneo completado: ${data.summary.licitaciones} licitaciones, ${data.summary.compras} compras ágiles.`)
        fetchTenders()
      } else {
        setStatus(`Error: ${data.message || 'Error desconocido'}`);
      }
    } catch (err) {
      setStatus('Error al escanear: ' + err.message)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="container">
      <header>
        <div className="logo">Nata de Mercado Público</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {showAuthModal ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Pega tu cookie aquí..." 
                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'white', width: '250px' }}
                value={cookieInput}
                onChange={(e) => setCookieInput(e.target.value)}
                id="cookie-input"
              />
              <button className="btn btn-secondary" onClick={async () => {
                const val = cookieInput;
                if(!val) return;
                setStatus('Guardando cookie...');
                try {
                  await fetch('/api/auth/cookie', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cookie: val })
                  });
                  setStatus('Cookie guardada con éxito.');
                  setShowAuthModal(false);
                } catch(e) { setStatus('Error'); }
              }}>Guardar Cookie</button>
            </div>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowAuthModal(true)} disabled={loading}>
                {loading && <div className="loading-spinner"></div>}
                Inyectar Sesión Manual
              </button>
              <button className="btn btn-primary" onClick={startScan} disabled={scanning}>
                {scanning && <div className="loading-spinner"></div>}
                Escanear Ahora
              </button>
            </>
          )}
        </div>
      </header>

      {status && (
        <div className="glass card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)', padding: '1rem 1.5rem' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span role="img" aria-label="info">ℹ️</span> {status}
          </p>
        </div>
      )}
      
      {!showAuthModal && (
        <div className="glass card" style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)' }}>
          <p style={{ fontSize: '0.85rem', color: '#fbbf24' }}>
            <strong>Aviso Anti-Bot:</strong> Dado que el firewall de Mercado Público está bloqueando navegadores automatizados, por favor inicia sesión en tu navegador normal, copia tu 'Cookie' (desde la pestaña de Red en F12) y haz clic en "Inyectar Sesión Manual" para pegarla.
          </p>
        </div>
      )}

      <main>
        <div className="section-title">
          <h2>Licitaciones Vigentes</h2>
          <span className="badge badge-blue">{licitaciones.length}</span>
        </div>
        
        <div className="grid">
          {licitaciones.length === 0 ? (
            <div className="glass card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-alt)' }}>No hay licitaciones escaneadas aún.</p>
            </div>
          ) : (
            licitaciones.map((l, index) => (
              <div key={index} className="glass card">
                <span className="badge badge-orange" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>{l.id || 'ID Pendiente'}</span>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{l.nombre || 'Licitación sin nombre'}</h3>
                <p style={{ color: 'var(--text-alt)', fontSize: '0.85rem', marginBottom: '1rem' }}>{l.organismo || 'Organismo desconocido'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>{l.monto || '$0'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-alt)' }}>Cierra: {l.fechaCierre || 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="section-title" style={{ marginTop: '4rem' }}>
          <h2>Compras Ágiles</h2>
          <span className="badge badge-green">{comprasAgiles.length}</span>
        </div>

        <div className="grid">
          {comprasAgiles.length === 0 ? (
            <div className="glass card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-alt)' }}>No hay compras ágiles detectadas.</p>
            </div>
          ) : (
            comprasAgiles.map((c, index) => (
              <div key={index} className="glass card">
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{c.descripcion || 'Sin descripción'}</h3>
                <p style={{ color: 'var(--text-alt)', fontSize: '0.85rem' }}>{c.organismo}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

export default App
