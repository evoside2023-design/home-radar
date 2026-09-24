/**
 * Debug: Odkryj API endpointy OLX i Otodom
 * Intercept network requests i pokaż co frontend używa
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function discoverAPIEndpoints() {
  console.log('🔍 Odkrywam API endpointy OLX i Otodom...\n');

  const browser = await puppeteer.launch({
    headless: false, // Pokaż browser żeby widzieć co się dzieje
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    // ========================================
    // TEST 1: OLX API
    // ========================================
    console.log('📍 TEST 1: OLX Sopot');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const pageOLX = await browser.newPage();
    const olxRequests = [];

    // Intercept wszystkie requesty
    await pageOLX.setRequestInterception(true);
    pageOLX.on('request', (request) => {
      const url = request.url();
      
      // Zapisz API calls (JSON/GraphQL)
      if (
        url.includes('/api/') || 
        url.includes('/graphql') || 
        url.includes('.json') ||
        url.includes('apollo') ||
        request.resourceType() === 'xhr' ||
        request.resourceType() === 'fetch'
      ) {
        olxRequests.push({
          method: request.method(),
          url: url,
          headers: request.headers(),
          postData: request.postData()
        });
      }
      
      request.continue();
    });

    // Załaduj stronę OLX
    await pageOLX.goto('https://www.olx.pl/nieruchomosci/sopot/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Scroll żeby załadować lazy content
    await pageOLX.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`\n✅ Znaleziono ${olxRequests.length} API requestów OLX:\n`);
    
    olxRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`   POST Data: ${req.postData.substring(0, 200)}...`);
      }
    });

    // Zapisz szczegóły do pliku
    const fs = require('fs');
    fs.writeFileSync(
      'olx-api-requests.json',
      JSON.stringify(olxRequests, null, 2)
    );
    console.log('\n💾 Szczegóły zapisane do: olx-api-requests.json\n');

    await pageOLX.close();

    // ========================================
    // TEST 2: Otodom API
    // ========================================
    console.log('\n📍 TEST 2: Otodom Sopot');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const pageOtodom = await browser.newPage();
    const otodomRequests = [];

    await pageOtodom.setRequestInterception(true);
    pageOtodom.on('request', (request) => {
      const url = request.url();
      
      if (
        url.includes('/api/') || 
        url.includes('/graphql') || 
        url.includes('.json') ||
        url.includes('apollo') ||
        request.resourceType() === 'xhr' ||
        request.resourceType() === 'fetch'
      ) {
        otodomRequests.push({
          method: request.method(),
          url: url,
          headers: request.headers(),
          postData: request.postData()
        });
      }
      
      request.continue();
    });

    await pageOtodom.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/sopot', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await pageOtodom.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`\n✅ Znaleziono ${otodomRequests.length} API requestów Otodom:\n`);
    
    otodomRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`   POST Data: ${req.postData.substring(0, 200)}...`);
      }
    });

    fs.writeFileSync(
      'otodom-api-requests.json',
      JSON.stringify(otodomRequests, null, 2)
    );
    console.log('\n💾 Szczegóły zapisane do: otodom-api-requests.json\n');

    await pageOtodom.close();

    // ========================================
    // ANALIZA
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ANALIZA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Znajdź główne API endpointy
    const olxMainAPI = olxRequests.find(r => 
      r.url.includes('listing') || 
      r.url.includes('search') ||
      r.url.includes('offers')
    );

    const otodomMainAPI = otodomRequests.find(r => 
      r.url.includes('listing') || 
      r.url.includes('search') ||
      r.url.includes('offers')
    );

    if (olxMainAPI) {
      console.log('🎯 OLX GŁÓWNY ENDPOINT:');
      console.log(`   ${olxMainAPI.method} ${olxMainAPI.url}`);
      console.log(`   Headers: ${JSON.stringify(olxMainAPI.headers, null, 2).substring(0, 300)}`);
    }

    if (otodomMainAPI) {
      console.log('\n🎯 OTODOM GŁÓWNY ENDPOINT:');
      console.log(`   ${otodomMainAPI.method} ${otodomMainAPI.url}`);
      console.log(`   Headers: ${JSON.stringify(otodomMainAPI.headers, null, 2).substring(0, 300)}`);
    }

    console.log('\n💡 NASTĘPNE KROKI:');
    console.log('   1. Otwórz pliki *-api-requests.json');
    console.log('   2. Znajdź endpoint zwracający listing data (JSON)');
    console.log('   3. Zrób curl/axios request żeby sprawdzić czy działa');
    console.log('   4. Zaimplementuj bezpośrednie API calls (bez Puppeteer!)');
    console.log('\n⏱️  Spodziewany czas: 0.5s zamiast 60s! 🚀\n');

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    console.log('🔍 Zostaw browser otwarty na 30s żeby zobaczyć Network tab...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

discoverAPIEndpoints();
