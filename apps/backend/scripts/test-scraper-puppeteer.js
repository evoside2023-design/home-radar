const PropertyScraper = require('../src/services/propertyScraper');

/**
 * Test Web Scraper (Puppeteer)
 * Testuje pobieranie ogłoszeń z OLX i Otodom
 */

async function testScraper() {
  console.log('🧪 TEST: Web Scraper (Puppeteer + Stealth)\n');
  console.log('⚠️  UWAGA: Ten test uruchomi prawdziwą przeglądarkę!');
  console.log('⏱️  Czas wykonania: ~1-2 minuty\n');

  const scraper = new PropertyScraper({
    headless: false, // pokaż przeglądarkę (do debugowania)
    delay: 2000
  });

  try {
    // Test 1: OLX
    console.log('🧪 TEST 1: Scraping OLX (1 strona)');
    console.log('─'.repeat(50));
    
    const olxProperties = await scraper.scrapeOLX('warszawa', 1);
    
    console.log(`\n✅ Znaleziono ${olxProperties.length} ogłoszeń z OLX`);
    
    if (olxProperties.length > 0) {
      const sample = olxProperties[0];
      console.log('\n📋 Przykładowe ogłoszenie:');
      console.log(JSON.stringify(sample, null, 2));
    }

    // Delay między testami
    console.log('\n⏳ Czekam 5s przed testem Otodom...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: Otodom
    console.log('\n🧪 TEST 2: Scraping Otodom (1 strona)');
    console.log('─'.repeat(50));
    
    const otodomProperties = await scraper.scrapeOtodom('warszawa', 1);
    
    console.log(`\n✅ Znaleziono ${otodomProperties.length} ogłoszeń z Otodom`);
    
    if (otodomProperties.length > 0) {
      const sample = otodomProperties[0];
      console.log('\n📋 Przykładowe ogłoszenie:');
      console.log(JSON.stringify(sample, null, 2));
    }

    // Statystyki
    const stats = scraper.getStats();
    console.log('\n📊 Statystyki:');
    console.log(`   Sukces: ${stats.success}`);
    console.log(`   Błędy: ${stats.failed}`);
    console.log(`   Pominięte: ${stats.skipped}`);

    console.log('\n🎉 Testy zakończone pomyślnie!');

  } catch (error) {
    console.error('\n❌ Błąd testu:', error.message);
    console.error(error.stack);
  } finally {
    await scraper.close();
    console.log('\n🔒 Przeglądarka zamknięta');
    process.exit(0);
  }
}

// Uruchom testy
console.log('🚀 Uruchamiam testy scrapera...\n');
testScraper().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
