const MercadoPublicoScanner = require('./backend/src/scanner');
const path = require('path');

async function test() {
  const scanner = new MercadoPublicoScanner();
  try {
    console.log('--- Iniciando Prueba de Escaneo ---');
    // Forzamos headless para el entorno del agente
    const originalInit = scanner.init;
    scanner.init = async function(cookiePath) {
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());
        
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const pages = await this.browser.pages();
        this.page = pages[0] || (await this.browser.newPage());
    };

    await scanner.init();
    
    console.log('\n1. Probando Licitaciones...');
    const licitaciones = await scanner.scrapeLicitaciones();
    console.log(`Resultado Licitaciones: ${licitaciones.length} encontradas.`);
    if (licitaciones.length > 0) {
        console.log('Ejemplo:', licitaciones[0]);
    }

    console.log('\n2. Probando Compras Ágiles...');
    const compras = await scanner.scrapeComprasAgiles();
    console.log(`Resultado Compras Ágiles: ${compras.length} encontradas.`);
    if (compras.length > 0) {
        console.log('Ejemplo:', compras[0]);
    }

  } catch (error) {
    console.error('Error en la prueba:', error);
  } finally {
    await scanner.close();
    console.log('\n--- Prueba Finalizada ---');
  }
}

test();
