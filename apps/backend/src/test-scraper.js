/**
 * Test scrapera - do ręcznego uruchomienia w terminalu
 * Użycie: node src/test-scraper.js
 */

require('dotenv').config({ path: '../../.env' });
const { testConnection } = require('./config/database');
const scraperService = require('./services/scraperService');

async function testScraper() {
  console.log('🧪 Test Scrapera DomRadar\n');
  console.log(`Mode: ${process.env.OLX_USE_MOCK === 'true' ? '🎭 MOCK DATA' : '🌐 PRODUCTION API'}\n`);

  // Test połączenia z bazą
  console.log('1️⃣  Testowanie połączenia z bazą danych...');
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Brak połączenia z bazą danych. Zakończenie testu.');
    process.exit(1);
  }

  console.log('\n2️⃣  Konfiguracja scrapera:');
  const status = scraperService.getStatus();
  console.log(JSON.stringify(status, null, 2));

  console.log('\n3️⃣  Uruchamiam scraping (tryb testowy - 1 miasto, 1 strona)...');
  
  // Zaktualizuj konfigurację na tryb testowy
  scraperService.updateConfig({
    cities: ['warszawa'],
    maxPagesPerCity: 1,
    delayBetweenRequests: 500,
    propertiesPerPage: 10
  });

  // Uruchom scraping
  const result = await scraperService.runOnce({
    cities: ['warszawa'],
    maxPages: 1,
    sources: ['olx'] // Test OLX API/Mock
  });

  console.log('\n4️⃣  Wyniki:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ Test zakończony pomyślnie!');
    if (process.env.OLX_USE_MOCK === 'true') {
      console.log('\n💡 Używasz MOCK DATA. Aby użyć prawdziwego API:');
      console.log('   1. Zarejestruj aplikację na https://developer.olx.pl');
      console.log('   2. Dodaj Client ID i Secret do .env');
      console.log('   3. Ustaw OLX_USE_MOCK=false w .env');
    }
  } else {
    console.log('\n❌ Test zakończony z błędami');
  }

  process.exit(result.success ? 0 : 1);
}

// Uruchom test
testScraper().catch(error => {
  console.error('\n❌ Krytyczny błąd:', error);
  process.exit(1);
});
