/**
 * Intercept Otodom MAIN LISTINGS GraphQL Query
 * Scroll + wait dla pełnej listy ogłoszeń
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function interceptOtodomListings() {
  console.log('🎯 Przechwytywanie GŁÓWNEJ listy ogłoszeń Otodom...\n');

  const browser = await puppeteer.launch({
    headless: false, // Zobacz co się dzieje
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    
    let mainListingsQuery = null;
    let allGraphQLResponses = [];

    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('/api/query') && url.includes('operationName')) {
        try {
          const json = await response.json();
          const operationName = new URL(url).searchParams.get('operationName');
          
          if (json.data) {
            allGraphQLResponses.push({
              operationName,
              data: json.data,
              url
            });

            console.log(`✅ ${operationName}`);

            // Szukamy głównego query z listingami
            const listingsCount = countListings(json.data);
            if (listingsCount > 10) {
              console.log(`   🎯 BINGO! ${listingsCount} ogłoszeń!`);
              mainListingsQuery = {
                operationName,
                data: json.data,
                url
              };
            }
          }
        } catch (e) {
          // Not JSON
        }
      }
    });

    const startTime = Date.now();
    
    console.log('📍 Ładuję stronę...\n');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/sopot', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('\n📜 Scrolluję w dół...');
    await autoScroll(page);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⏱️  Czas: ${elapsed}s`);
    console.log(`📦 Przechwycono ${allGraphQLResponses.length} GraphQL queries\n`);

    // Pokaż wszystkie queries
    allGraphQLResponses.forEach((resp, i) => {
      const count = countListings(resp.data);
      console.log(`${i + 1}. ${resp.operationName} - ${count} listings`);
    });

    if (mainListingsQuery) {
      const listings = extractListings(mainListingsQuery.data);
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ SUKCES! Znaleziono główny query z listami`);
      console.log(`📋 Operation: ${mainListingsQuery.operationName}`);
      console.log(`🎯 Ogłoszeń: ${listings.length}`);
      console.log(`⚡ Czas: ${elapsed}s`);
      
      // Pokaż pierwsze ogłoszenie
      if (listings[0]) {
        console.log(`\n📋 Przykład (pierwsze ogłoszenie):`);
        console.log(JSON.stringify(listings[0], null, 2).substring(0, 800));
        console.log('...\n');
      }

      // Zapisz URL dla przyszłego użycia
      console.log(`🔗 GraphQL URL:`);
      console.log(mainListingsQuery.url.substring(0, 200) + '...\n');

      // Zapisz query details
      const fs = require('fs');
      fs.writeFileSync(
        'otodom-main-query.json',
        JSON.stringify({
          operationName: mainListingsQuery.operationName,
          url: mainListingsQuery.url,
          listingsCount: listings.length,
          sampleListing: listings[0]
        }, null, 2)
      );
      console.log(`💾 Zapisano szczegóły do: otodom-main-query.json`);

    } else {
      console.log(`\n⚠️  Nie znaleziono głównego query z listami`);
      console.log(`💡 Sprawdź przechwycone queries ręcznie`);
    }

    console.log(`\n🔍 Zostaw browser otwarty na 10s...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await browser.close();
  }
}

// Auto-scroll helper
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

// Count listings in GraphQL response
function countListings(obj, depth = 0) {
  if (depth > 5) return 0;
  
  let count = 0;
  
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (item && typeof item === 'object' && item.id && (item.title || item.slug)) {
        count++;
      }
      count += countListings(item, depth + 1);
    });
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => {
      count += countListings(value, depth + 1);
    });
  }
  
  return count;
}

// Extract all listings
function extractListings(obj, depth = 0) {
  if (depth > 5) return [];
  
  const listings = [];
  
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (item && typeof item === 'object' && item.id && (item.title || item.slug)) {
        if (item.location || item.totalPrice) {
          listings.push(item);
        }
      }
      listings.push(...extractListings(item, depth + 1));
    });
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => {
      listings.push(...extractListings(value, depth + 1));
    });
  }
  
  return listings;
}

interceptOtodomListings();
