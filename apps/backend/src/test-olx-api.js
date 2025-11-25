/**
 * Test OLX API - sprawdź czy mają publiczne endpoint dla listings
 */

const axios = require('axios');

async function testOLXAPI() {
  console.log('🔍 Sprawdzam OLX API...\n');

  // Różne potencjalne endpointy
  const endpoints = [
    'https://www.olx.pl/api/v1/offers/?offset=0&limit=40&category_id=15&city_id=15983',
    'https://www.olx.pl/api/v2/offers/search',
    'https://www.olx.pl/api/v1/targeting/data',
    'https://www.olx.pl/nieruchomosci/sopot/?page=1&view=list'
  ];

  for (const url of endpoints) {
    try {
      console.log(`📍 Testuję: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html',
          'Accept-Language': 'pl-PL,pl;q=0.9'
        },
        timeout: 5000
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`📦 Content-Type: ${response.headers['content-type']}`);
      
      if (typeof response.data === 'object') {
        console.log(`📋 Keys: ${Object.keys(response.data).join(', ')}`);
      }
      console.log('');

    } catch (error) {
      console.log(`❌ ${error.response?.status || error.message}\n`);
    }
  }

  console.log('💡 Wniosek: OLX/Otodom nie mają publicznego API.');
  console.log('🎯 Rozwiązanie: Puppeteer + GraphQL intercept (dla Otodom)');
  console.log('⚡ Optymalizacja: Cache + background scraping\n');
}

testOLXAPI();
