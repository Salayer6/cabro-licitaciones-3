const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const path = require('path');
const fs = require('fs');
const delay = ms => new Promise(res => setTimeout(res, ms));

class MercadoPublicoScanner {
  constructor() {
    this.userDataDir = path.join(__dirname, '../data/browser_profile');
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
    this.browser = null;
    this.page = null;
  }

  async init(externalCookiePath) {
    const launchOptions = {
      headless: true,
      userDataDir: this.userDataDir,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    // Only add executablePath if we are on Windows and it's not production
    if (process.platform === 'win32' && process.env.NODE_ENV !== 'production') {
      launchOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      launchOptions.headless = false; // Easier debugging locally
      launchOptions.args.push('--start-maximized');
      launchOptions.defaultViewport = null;
    }

    this.browser = await puppeteer.launch(launchOptions);
    
    const pages = await this.browser.pages();
    this.page = pages[0] || (await this.browser.newPage());

    // Inject manual cookie if it exists
    const cookiePath = externalCookiePath || path.join(__dirname, '../data/manual_cookie.txt');
    if (fs.existsSync(cookiePath)) {
      const cookieStr = fs.readFileSync(cookiePath, 'utf8');
      await this.page.setExtraHTTPHeaders({ 'Cookie': cookieStr });
      console.log('Cookie manual inyectada en el navegador.');
    }
  }

  async manualLogin() {
    console.log('Navegando a la página principal para establecer cookies de sesión...');
    await this.page.goto('https://www.mercadopublico.cl/', { waitUntil: 'domcontentloaded' }).catch(() => null);
    await delay(2000); // Give the site time to assign session variables
    
    console.log('Intentando click en login...');
    try {
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        this.page.click('a[href="/Home/Login"]')
      ]);
    } catch (e) {
      console.log('Click falló o superó el tiempo. Navegando directamente al login...');
      await this.page.goto('https://www.mercadopublico.cl/Home/Login', { waitUntil: 'domcontentloaded' }).catch(() => null);
    }
    
    console.log('Por favor, ingresa los datos de Clave Única manualmente si es necesario.');
    
    // Wait for the user to be on the dashboard or portal
    await this.page.waitForFunction(
      "window.location.href.includes('mercadopublico.cl/Portal') || window.location.href.includes('Dashboard')",
      { timeout: 0 }
    );
    console.log('Estado de autenticación guardado automáticamente en el perfil del navegador.');
  }

  async scrapeLicitaciones() {
    try {
      if (!this.page) await this.init();
      
      console.log('Navegando a Buscar Licitación...');
      await this.page.goto('https://www.mercadopublico.cl/Portal/Seleccion/BuscarLicitacion.aspx', { waitUntil: 'domcontentloaded' });
      
      await this.page.waitForSelector('.c-tabla-compras', { timeout: 15000 }).catch(() => null);

      const results = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.c-tabla-compras tbody tr'));
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 5) return null;
          return {
            id: cells[0]?.innerText?.trim(),
            nombre: cells[1]?.innerText?.trim(),
            organismo: cells[2]?.innerText?.trim(),
            monto: cells[3]?.innerText?.trim() || 'Ver en ficha',
            fechaCierre: cells[4]?.innerText?.trim()
          };
        }).filter(item => item !== null);
      });

      console.log(`Encontradas ${results.length} licitaciones.`);
      return results;
    } catch (error) {
      console.error('Error scraping licitaciones:', error);
      return [];
    }
  }

  async scrapeComprasAgiles() {
    try {
      if (!this.page) await this.init();
      
      console.log('Navegando a la nueva plataforma de Compras Ágiles...');
      // Usamos el buscador moderno que es más estable
      await this.page.goto('https://buscador.mercadopublico.cl/compra-agil', { waitUntil: 'domcontentloaded' });
      
      // Esperamos a que carguen los resultados (grilla de Material UI)
      await this.page.waitForSelector('h4', { timeout: 20000 }).catch(() => null);
      
      const results = await this.page.evaluate(() => {
        // Buscamos los contenedores de las tarjetas
        // En la nueva plataforma, las tarjetas suelen estar dentro de un MuiGrid-item
        // Buscamos elementos que contengan un H4 (título) y un link de detalle
        const cards = Array.from(document.querySelectorAll('div')).filter(el => 
          el.querySelector('h4') && el.innerText.includes('Revisar detalle')
        );

        return cards.map(card => {
          const titleEl = card.querySelector('h4');
          const textContent = card.innerText || '';
          
          // El ID suele estar en un span arriba del H4
          // Intentamos extraerlo con regex si no hay selector claro
          const idMatch = textContent.match(/[0-9]+-[0-9]+-[A-Z0-9]+/);
          
          // El organismo suele estar en la parte inferior
          // Buscamos líneas que no sean el título ni el ID
          const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          
          return {
            id: idMatch ? idMatch[0] : 'ID Pendiente',
            descripcion: titleEl ? titleEl.innerText : 'Sin descripción',
            organismo: lines.find(l => l.toUpperCase() === l && l.length > 10) || 'Organismo Detectado'
          };
        }).filter(item => item.descripcion !== 'Sin descripción');
      });

      console.log(`Encontradas ${results.length} compras ágiles reales.`);
      return results;
    } catch (error) {
      console.error('Error scraping compras agiles:', error);
      return [];
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = MercadoPublicoScanner;
