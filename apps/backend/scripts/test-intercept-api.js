/**
 * Test: Intercept Otodom GraphQL API używając Puppeteer
 * Puppeteer obejdzie 403, a my przechwycimy JSON response!
 * 
 * Strategia: Zamiast parsować HTML, przechwycimy GraphQL response
 * Oczekiwany czas: ~5-10s (zamiast 32s parsowania HTML)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function interceptOtodomAPI() {
  console.log('🎯 Intercepting Otodom GraphQL API...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Przechwycimy GraphQL responses
    const graphqlResponses = [];

    page.on('response', async (response) => {
      const url = response.url();
      
      // Szukamy GraphQL queries z danymi ogłoszeń
      if (url.includes('/api/query') && url.includes('operationName')) {
        try {
          const json = await response.json();
          
          // Znajdź queries z listings
          if (json.data) {
            graphqlResponses.push({
              url,
              operationName: new URL(url).searchParams.get('operationName'),
              data: json.data
            });
            
            console.log(`✅ Przechwycono: ${new URL(url).searchParams.get('operationName')}`);
          }
        } catch (e) {
          // Nie JSON lub error
        }
      }
    });

    const startTime = Date.now();
    
    // Załaduj stronę Otodom
    console.log('📍 Ładuję: https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/sopot\n');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/sopot', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Poczekaj na GraphQL requests
    await new Promise(resolve => setTimeout(resolve, 3000));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⏱️  Czas: ${elapsed}s`);
    console.log(`📦 Przechwycono ${graphqlResponses.length} GraphQL responses\n`);

    // Analiza responses
    graphqlResponses.forEach((resp, i) => {
      console.log(`${i + 1}. Operation: ${resp.operationName}`);
      console.log(`   Keys: ${Object.keys(resp.data).join(', ')}`);
      
      // Szukamy listings
      const listings = findListings(resp.data);
      if (listings.length > 0) {
        console.log(`   🎯 ZNALEZIONO ${listings.length} OGŁOSZEŃ!`);
        
        // Pokaż pierwsze ogłoszenie
        if (listings[0]) {
          console.log(`\n   📋 Przykład ogłoszenia:`);
          console.log(`   ${JSON.stringify(listings[0], null, 2).substring(0, 500)}...\n`);
        }
      }
      console.log('');
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n💡 WYNIK:`);
    
    const totalListings = graphqlResponses.reduce((sum, resp) => {
      return sum + findListings(resp.data).length;
    }, 0);

    if (totalListings > 0) {
      console.log(`✅ SUKCES! Przechwycono ${totalListings} ogłoszeń z GraphQL API`);
      console.log(`⚡ Czas: ${elapsed}s (zamiast 32s HTML scraping)`);
      console.log(`🚀 Przyspieszenie: ${(32 / parseFloat(elapsed)).toFixed(1)}x`);
      console.log(`\n🎯 To jest nasze rozwiązanie! Używamy Puppeteer + GraphQL intercept`);
    } else {
      console.log(`⚠️  Nie znaleziono ogłoszeń w przechwyconych responses`);
      console.log(`💡 Możliwe że trzeba scrollować stronę lub kliknąć "Load More"`);
    }

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await browser.close();
  }
}

// Helper: Znajdź listings w GraphQL response (rekurencyjnie)
function findListings(obj, depth = 0) {
  if (depth > 5) return []; // Max głębokość
  
  const listings = [];
  
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      // Sprawdź czy to listing (ma typowe pola)
      if (item && typeof item === 'object' && (item.id || item.title || item.slug)) {
        if (item.location || item.price || item.totalPrice) {
          listings.push(item);
        }
      }
      listings.push(...findListings(item, depth + 1));
    });
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => {
      listings.push(...findListings(value, depth + 1));
    });
  }
  
  return listings;
}

interceptOtodomAPI();
