/**
 * Test czasu scraping'u dla zapytania użytkownika
 * Symulacja: User wpisuje "mieszkanie Sopot"
 */

const PropertyScraper = require('./services/propertyScraper');

async function testUserQuery() {
  console.log('⏱️  TEST: Jak długo user będzie czekał na wyniki?');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Zapytanie: "mieszkanie Sopot"');
  console.log('🎯 Cel: Pobrać aktualne ogłoszenia z OLX i Otodom\n');

  const startTime = Date.now();
  const scraper = new PropertyScraper({
    headless: true, // Szybszy tryb (bez UI)
    timeout: 30000
  });

  try {
    await scraper.initialize();
    console.log('✅ Przeglądarka uruchomiona\n');

    // Test 1: OLX Sopot (1 strona)
    console.log('🔍 Krok 1/2: Scraping OLX...');
    const olxStart = Date.now();
    const olxResults = await scraper.scrapeOLX('sopot', 1);
    const olxTime = ((Date.now() - olxStart) / 1000).toFixed(1);
    console.log(`✅ OLX: ${olxResults.length} ogłoszeń w ${olxTime}s\n`);

    // Delay między źródłami (rate limiting)
    console.log('⏳ Czekam 3s (rate limiting)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Otodom Sopot (1 strona)
    console.log('🔍 Krok 2/2: Scraping Otodom...');
    const otodomStart = Date.now();
    const otodomResults = await scraper.scrapeOtodom('sopot', 1);
    const otodomTime = ((Date.now() - otodomStart) / 1000).toFixed(1);
    console.log(`✅ Otodom: ${otodomResults.length} ogłoszeń w ${otodomTime}s\n`);

    await scraper.close();

    // Podsumowanie
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalResults = olxResults.length + otodomResults.length;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 WYNIKI:');
    console.log(`   ⏱️  Całkowity czas: ${totalTime}s`);
    console.log(`   📦 Znaleziono ogłoszeń: ${totalResults}`);
    console.log(`   📈 Średni czas/ogłoszenie: ${(totalTime / totalResults * 1000).toFixed(0)}ms`);
    console.log('');
    console.log('⚠️  Czas rozkłada się na:');
    console.log(`   • OLX scraping: ${olxTime}s`);
    console.log(`   • Otodom scraping: ${otodomTime}s`);
    console.log(`   • Rate limiting: 3s`);
    console.log(`   • Overhead (uruchomienie): ~2-3s`);
    console.log('');
    
    // Ocena UX
    if (totalTime < 15) {
      console.log('✅ UX: DOSKONAŁY - User nie zauważy opóźnienia');
    } else if (totalTime < 30) {
      console.log('⚠️  UX: AKCEPTOWALNY - User może zauważyć ładowanie');
      console.log('💡 Sugestia: Dodać loading spinner + partial results');
    } else {
      console.log('❌ UX: ZA DŁUGI - User może się zniecierpliwić');
      console.log('💡 Sugestia: Background jobs + cache + partial results');
    }

    console.log('');
    console.log('💡 OPTYMALIZACJE:');
    console.log('   1. Cache wyników (5-15 min) - zmniejszy czas do ~0.1s');
    console.log('   2. Background scraping co 10 min - user zawsze dostaje cached data');
    console.log('   3. Partial results - pokazuj OLX od razu (nie czekaj na Otodom)');
    console.log('   4. Pagination - scrape tylko 1 stronę, user może "Load More"');
    console.log('');

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await scraper.close();
    process.exit(1);
  }
}

testUserQuery();
