const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const MercadoPublicoScanner = require('./scanner');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const scanner = new MercadoPublicoScanner();
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const LicitacionesPath = path.join(DATA_DIR, 'licitaciones.json');
const ComprasAgilesPath = path.join(DATA_DIR, 'compras_agiles.json');

// Get all tenders
app.get('/api/licitaciones', (req, res) => {
  if (fs.existsSync(LicitacionesPath)) {
    const data = JSON.parse(fs.readFileSync(LicitacionesPath));
    res.json(data);
  } else {
    res.json([]);
  }
});

// Get agile purchases
app.get('/api/compras-agiles', (req, res) => {
  if (fs.existsSync(ComprasAgilesPath)) {
    const data = JSON.parse(fs.readFileSync(ComprasAgilesPath));
    res.json(data);
  } else {
    res.json([]);
  }
});

// Save injected manual cookie
app.post('/api/auth/cookie', async (req, res) => {
  try {
    const { cookie } = req.body;
    if (cookie) {
      fs.writeFileSync(path.join(DATA_DIR, 'manual_cookie.txt'), cookie);
      res.json({ status: 'success', message: 'Cookie guardada exitosamente.' });
    } else {
      res.status(400).json({ status: 'error', message: 'Cookie vacía.' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Trigger scan
app.post('/api/scan', async (req, res) => {
  try {
    await scanner.init();
    const licitaciones = await scanner.scrapeLicitaciones();
    const comprasAgiles = await scanner.scrapeComprasAgiles();
    
    fs.writeFileSync(LicitacionesPath, JSON.stringify(licitaciones || []));
    fs.writeFileSync(ComprasAgilesPath, JSON.stringify(comprasAgiles || []));
    
    res.json({ status: 'success', summary: { licitaciones: (licitaciones || []).length, compras: (comprasAgiles || []).length } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  } finally {
    await scanner.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
