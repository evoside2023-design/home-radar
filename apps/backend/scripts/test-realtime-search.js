/**
 * Test Real-Time Search
 * Symulacja: User wpisuje "Sopot" → Pobierz WSZYSTKIE ogłoszenia
 */

const RealTimeScraper = require('../src/services/realTimeScraper');

async function testRealTimeSearch() {
  console.log('🚀 TEST: Real-Time Property Search\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Scenariusz: User szuka mieszkań w Sopocie');
  console.log('Oczekiwany wynik: ~460 ogłoszeń (wszystkie dostępne)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const scraper = new RealTimeScraper();

  try {
    // Szukaj mieszkań w Sopocie (max 15 stron per source = ~600 ogłoszeń)
    const result = await scraper.search({
      city: 'sopot',
      maxPages: 15 // OLX i Otodom mają po ~40 listings/strona
    });

    // Pokaż przykładowe ogłoszenia
    console.log('📋 Przykładowe ogłoszenia:\n');
    
    const olxSample = result.results.find(r => r.source === 'olx');
    if (olxSample) {
      console.log('OLX:');
      console.log(JSON.stringify(olxSample, null, 2).substring(0, 400));
      console.log('...\n');
    }

    const otodomSample = result.results.find(r => r.source === 'otodom');
    if (otodomSample) {
      console.log('Otodom:');
      console.log(JSON.stringify(otodomSample, null, 2).substring(0, 400));
      console.log('...\n');
    }

    // Podsumowanie
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PODSUMOWANIE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Znaleziono: ${result.stats.total} ogłoszeń`);
    console.log(`   • OLX: ${result.stats.olx}`);
    console.log(`   • Otodom: ${result.stats.otodom}`);
    console.log(`⏱️  Czas wyszukiwania: ${result.stats.duration}s`);
    console.log(`📈 Średnio: ${(result.stats.duration / result.stats.total).toFixed(3)}s per ogłoszenie`);
    
    // Ocena UX
    console.log('\n💡 OCENA UX:');
    if (result.stats.duration < 30) {
      console.log('✅ DOSKONAŁY - User może czekać <30s');
    } else if (result.stats.duration < 60) {
      console.log('⚠️  AKCEPTOWALNY - User może się niecierpliwić');
      console.log('💡 Sugestia: Pokazuj partial results (progressive loading)');
    } else {
      console.log('❌ ZA DŁUGI - Wymaga optymalizacji');
      console.log('💡 Sugestia: Limit do 5-10 stron lub cache');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRealTimeSearch();
