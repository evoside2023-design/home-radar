const PropertySubmissionService = require('../services/propertySubmissionService');

/**
 * Test Property Submission Service
 * Testuje nowy flow user-generated content
 */

async function testSubmission() {
  console.log('🧪 TEST: Property Submission Service\n');
  
  const service = new PropertySubmissionService();

  // Test URLs
  const testUrls = [
    'https://www.olx.pl/d/oferta/mieszkanie-3-pokojowe-warszawa-mokotow-ID123456.html',
    'https://www.otodom.pl/pl/oferta/mieszkanie-warszawa-srodmiescie-ID789012.html',
  ];

  console.log('📋 Test URLs:');
  testUrls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  console.log('');

  // Test 1: Submit pojedynczy link
  console.log('🧪 TEST 1: Submit pojedynczy link');
  console.log('─'.repeat(50));
  
  try {
    const result = await service.submitPropertyLink(testUrls[0], null);
    console.log('✅ Status:', result.status);
    console.log('✅ Message:', result.message);
    console.log('✅ Property ID:', result.property?.id);
    console.log('');
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.log('');
  }

  // Test 2: Duplikat (ten sam link)
  console.log('🧪 TEST 2: Próba dodania duplikatu');
  console.log('─'.repeat(50));
  
  try {
    const result = await service.submitPropertyLink(testUrls[0], null);
    console.log('✅ Status:', result.status);
    console.log('✅ Message:', result.message);
    console.log('');
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.log('');
  }

  // Test 3: Nieprawidłowy URL
  console.log('🧪 TEST 3: Nieprawidłowy URL');
  console.log('─'.repeat(50));
  
  try {
    const result = await service.submitPropertyLink('https://google.com', null);
    console.log('✅ Status:', result.status);
  } catch (error) {
    console.log('✅ Oczekiwany błąd:', error.message);
    console.log('');
  }

  // Test 4: Statystyki
  console.log('🧪 TEST 4: Statystyki submissionów');
  console.log('─'.repeat(50));
  
  try {
    const stats = await service.getSubmissionStats();
    console.log('✅ Total properties:', stats.total);
    console.log('✅ By source:', stats.bySource.map(s => `${s.source}: ${s.count}`).join(', '));
    console.log('✅ Recent submissions:', stats.recentSubmissions.length);
    console.log('');
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.log('');
  }

  console.log('🎉 Testy zakończone!');
  console.log('');
  console.log('💡 Użycie w API:');
  console.log('   POST /api/properties/submit');
  console.log('   Body: { "url": "https://olx.pl/..." }');
  console.log('');
  
  process.exit(0);
}

// Run tests
testSubmission().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
