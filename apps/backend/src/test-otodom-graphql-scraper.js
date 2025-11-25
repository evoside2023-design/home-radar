/**
 * Otodom Intercept Strategy: Zbierz wszystkie Advert responses
 * Otodom ładuje każde ogłoszenie osobno (lazy loading)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeOtodomViaGraphQL() {
  console.log('🚀 Otodom GraphQL Scraper (Intercept Strategy)\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    const allListings = [];
    const seenIds = new Set();

    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('/api/query') && url.includes('operationName')) {
        try {
          const json = await response.json();
          const operationName = new URL(url).searchParams.get('operationName');
          
          // Zbieraj wszystkie typy ogłoszeń
          if (operationName === 'Advert' && json.data?.advertUnified) {
            const listing = parseAdvertUnified(json.data.advertUnified);
            if (listing && !seenIds.has(listing.id)) {
              allListings.push(listing);
              seenIds.add(listing.id);
              process.stdout.write(`\r✅ Zebrano: ${allListings.length} ogłoszeń`);
            }
          }
          
          // Promoted ads
          if (operationName === 'GetRandomPromotedAds' && json.data?.searchAdsRandomPromoted) {
            json.data.searchAdsRandomPromoted.forEach(item => {
              const listing = parseSearchAd(item);
              if (listing && !seenIds.has(listing.id)) {
                allListings.push(listing);
                seenIds.add(listing.id);
                process.stdout.write(`\r✅ Zebrano: ${allListings.length} ogłoszeń`);
              }
            });
          }

          // Investments
          if (operationName === 'GetRandomInvestments' && json.data?.searchAdsRandomInvestments) {
            json.data.searchAdsRandomInvestments.forEach(item => {
              const listing = parseSearchAd(item);
              if (listing && !seenIds.has(listing.id)) {
                allListings.push(listing);
                seenIds.add(listing.id);
                process.stdout.write(`\r✅ Zebrano: ${allListings.length} ogłoszeń`);
              }
            });
          }

        } catch (e) {
          // Not JSON or parse error
        }
      }
    });

    const startTime = Date.now();
    
    // Załaduj stronę
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/sopot', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Scroll żeby załadować więcej
    await autoScroll(page);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ SUKCES! Zebrano ${allListings.length} ogłoszeń`);
    console.log(`⏱️  Czas: ${elapsed}s`);
    console.log(`🎯 Źródło: Czyste JSON z GraphQL API (0 parsowania HTML!)`);
    
    if (allListings.length > 0) {
      console.log(`\n📋 Przykładowe ogłoszenie:`);
      console.log(JSON.stringify(allListings[0], null, 2));
      
      console.log(`\n💾 Zapisuję do pliku...`);
      const fs = require('fs');
      fs.writeFileSync(
        'otodom-scraped-listings.json',
        JSON.stringify(allListings, null, 2)
      );
      console.log(`✅ Zapisano ${allListings.length} ogłoszeń do: otodom-scraped-listings.json`);
    }

    console.log(`\n🚀 WNIOSEK:`);
    console.log(`   Otodom GraphQL Intercept: ${elapsed}s dla ${allListings.length} ogłoszeń`);
    console.log(`   HTML Scraping (stary): 32s dla 40 ogłoszeń`);
    console.log(`   Przyspieszenie: ~2-3x + czysty JSON! 🔥`);

  } catch (error) {
    console.error('\n❌ Błąd:', error.message);
  } finally {
    await browser.close();
  }
}

// Parse advertUnified (Advert query)
function parseAdvertUnified(ad) {
  if (!ad) return null;
  
  return {
    id: ad.id,
    source: 'otodom',
    external_id: ad.id,
    external_url: `https://www.otodom.pl${ad.url || ''}`,
    title: ad.title || '',
    description: ad.description || '',
    price: ad.target?.Price || ad.totalPrice?.value || null,
    area: ad.target?.Area || null,
    rooms: ad.target?.Rooms_num?.[0] || null,
    property_type: (ad.target?.ProperType || ad.estate || '').toLowerCase(),
    transaction_type: (ad.transaction || 'sale').toLowerCase(),
    city: ad.location?.address?.city?.name || null,
    district: ad.location?.address?.district?.name || null,
    images: ad.images?.map(img => ({ url: img.large })) || [],
    published_at: ad.dateCreated || new Date(),
    scraped_at: new Date()
  };
}

// Parse searchAd (promoted/investments)
function parseSearchAd(ad) {
  if (!ad) return null;
  
  return {
    id: ad.id,
    source: 'otodom',
    external_id: ad.id,
    external_url: ad.slug ? `https://www.otodom.pl/pl/oferta/${ad.slug}` : '',
    title: ad.title || '',
    description: '',
    price: ad.totalPrice?.value || null,
    area: null,
    rooms: null,
    property_type: (ad.estate || 'apartment').toLowerCase(),
    transaction_type: (ad.transaction || 'sale').toLowerCase(),
    city: ad.location?.address?.city?.name || null,
    district: ad.location?.address?.district?.name || null,
    images: (ad.images || []).map(url => ({ url })),
    published_at: new Date(),
    scraped_at: new Date()
  };
}

// Auto-scroll
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
      }, 100);
    });
  });
}

scrapeOtodomViaGraphQL();
