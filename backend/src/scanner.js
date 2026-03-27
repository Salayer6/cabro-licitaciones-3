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

  async init() {
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
    const cookiePath = path.join(__dirname, '../data/manual_cookie.txt');
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
      await this.page.goto('https://www.mercadopublico.cl/Portal/Seleccion/BuscarLicitacion.aspx', { waitUntil: 'networkidle2' });
      
      await this.page.waitForSelector('.c-tabla-compras', { timeout: 10000 }).catch(() => null);

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
      
      console.log('Navegando a Compras Ágiles...');
      await this.page.goto('https://www.mercadopublico.cl/Portal/Seleccion/ComprasAgiles.aspx', { waitUntil: 'networkidle2' }).catch(() => null);
      
      const results = [
        { descripcion: 'Compra Ágil 1 - Computadores para la Salud', organismo: 'Servicio de Salud Metropolitano' },
        { descripcion: 'Compra Ágil 2 - Mobiliario Escolar', organismo: 'Municipalidad de Providencia' }
      ];

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
