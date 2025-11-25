/**
 * Test Otodom GraphQL API - bezpośredni dostęp (BEZ Puppeteer!)
 * Oczekiwany czas: 0.5s zamiast 32s! 🚀
 */

const axios = require('axios');

// Persisted query hashes odkryte z DevTools
const PERSISTED_QUERIES = {
  GetRandomPromotedAds: 'c93d6c30367f0dbbb4d6333f8f82c375bf41dbf66e5e7b5907f7e2ac415c8027',
  Advert: '456602b68ff29de343fff19f41980b07511088471c0d2fed8fd2b4bbb99bd72d'
};

async function testOtodomAPI() {
  console.log('🚀 Test Otodom GraphQL API (bez Puppeteer)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();

  try {
    // Query variables
    const variables = {
      filterAttributes: {
        estate: 'FLAT',
        market: 'ALL',
        ownerTypeSingleSelect: 'ALL',
        transaction: 'SELL'
      },
      filterLocations: {
        byDomainId: [
          { domainId: 'pomorskie/sopot/sopot/sopot' }
        ]
      },
      lang: 'PL',
      sort: {
        by: 'DEFAULT',
        direction: 'DESC'
      }
    };

    // Persisted query extension
    const extensions = {
      persistedQuery: {
        sha256Hash: PERSISTED_QUERIES.GetRandomPromotedAds,
        version: 1
      }
    };

    // Build URL
    const url = `https://www.otodom.pl/api/query?operationName=GetRandomPromotedAds&variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;

    console.log(`📍 URL: ${url.substring(0, 100)}...\n`);

    // Make request
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/graphql-response+json, application/json',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Referer': 'https://www.otodom.pl/',
        'Origin': 'https://www.otodom.pl'
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Response received in ${elapsed}s\n`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Data keys: ${Object.keys(response.data).join(', ')}\n`);

    // Parse results
    if (response.data && response.data.data) {
      const data = response.data.data;
      console.log(`📋 Available data:`);
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));
      console.log('\n...');

      // Count listings
      const listings = data.randomPromotedAds || [];
      console.log(`\n✅ Znaleziono ${listings.length} ogłoszeń!\n`);

      if (listings.length > 0) {
        console.log(`📋 Przykładowe ogłoszenie:`);
        console.log(JSON.stringify(listings[0], null, 2).substring(0, 500));
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⏱️  Całkowity czas: ${elapsed}s`);
    console.log(`🔥 Porównanie: Puppeteer = 32s, API = ${elapsed}s`);
    console.log(`🚀 Przyspieszenie: ${(32 / parseFloat(elapsed)).toFixed(0)}x szybciej!`);
    console.log(`\n💡 SUKCES! Możemy używać tego API zamiast scraping'u!`);

  } catch (error) {
    console.error(`\n❌ Błąd:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }
}

testOtodomAPI();
