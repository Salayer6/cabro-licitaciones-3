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
      
      console.log('Navegando a Buscar Licitación (Nueva URL)...');
      await this.page.goto('https://www.mercadopublico.cl/Home/BusquedaLicitacion', { waitUntil: 'networkidle2' });
      
      // Wait for at least one tender card or the main results container
      await this.page.waitForSelector('h2', { timeout: 20000 }).catch(() => null);
      
      // Scroll a bit to trigger any lazy loading if necessary
      await this.page.evaluate(() => window.scrollBy(0, 500));
      await delay(1000);

      const results = await this.page.evaluate(() => {
        // Find elements that look like tender cards
        // They typically contain "ID Licitación:"
        const cards = Array.from(document.querySelectorAll('div')).filter(el => 
          el.innerText && el.innerText.includes('ID Licitación:') && el.querySelector('h2')
        );

        return cards.map(card => {
          const titleEl = card.querySelector('h2');
          const textContent = card.innerText || '';
          
          // Improved ID extraction
          const idMatch = textContent.match(/ID Licitación:\s*([A-Z0-9-]+)/i);
          const id = idMatch ? idMatch[1] : 'N/A';

          // Extract organism - usually in a specific div or following a pattern
          // We can look for common markers or just the text below the title
          const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          const organism = lines.find(l => l.toUpperCase() === l && l.length > 5 && !l.includes('ID ')) || 'Organismo por detectar';

          // Extract monto
          const montoMatch = textContent.match(/monto[^$]*(\$[\s0-9.]+)/i);
          const monto = montoMatch ? montoMatch[1] : 'Ver en ficha';

          // Extract fecha cierre
          const fechaMatch = textContent.match(/cierre:\s*([0-9/:\s]+)/i);
          const fechaCierre = fechaMatch ? fechaMatch[1] : 'N/A';

          return {
            id,
            nombre: titleEl ? titleEl.innerText.trim() : 'Sin nombre',
            organismo,
            monto,
            fechaCierre
          };
        }).filter(item => item.id !== 'N/A');
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
      await this.page.goto('https://buscador.mercadopublico.cl/compra-agil', { waitUntil: 'networkidle2' });
      
      // Esperamos a que carguen los resultados (grilla dinámica)
      await this.page.waitForSelector('h4, h5', { timeout: 25000 }).catch(() => null);
      
      // Scroll para asegurar carga de contenido dinámico
      await this.page.evaluate(() => window.scrollBy(0, 800));
      await delay(2000);

      const results = await this.page.evaluate(() => {
        // En Compra Ágil actual, las tarjetas suelen tener un h4 o h5 como título
        // y un ID con formato COTXX
        const cards = Array.from(document.querySelectorAll('div')).filter(el => 
          (el.querySelector('h4') || el.querySelector('h5')) && el.innerText.includes('COT')
        );

        return cards.map(card => {
          const titleEl = card.querySelector('h4') || card.querySelector('h5');
          const textContent = card.innerText || '';
          
          // ID Pattern: XXXX-XXX-COTXX
          const idMatch = textContent.match(/[0-9]+-[0-9]+-[A-Z0-9]+/);
          
          // El organismo suele estar en negrita o al final de la tarjeta
          const strongs = Array.from(card.querySelectorAll('strong'));
          const organism = strongs.length > 0 ? strongs[0].innerText : 'Organismo Detectado';

          return {
            id: idMatch ? idMatch[0] : 'ID Pendiente',
            descripcion: titleEl ? titleEl.innerText.trim() : 'Sin descripción',
            organismo: organism.trim()
          };
        }).filter(item => item.descripcion !== 'Sin descripción' && item.id !== 'ID Pendiente');
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
