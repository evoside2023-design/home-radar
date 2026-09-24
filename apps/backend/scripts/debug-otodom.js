const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

/**
 * Debug Otodom - sprawdź aktualną strukturę HTML
 */
async function debugOtodom() {
  console.log('🔍 Sprawdzam strukturę HTML Otodom...\n');

  const browser = await puppeteer.launch({
    headless: false, // Pokaż przeglądarkę
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920x1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    const url = 'https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/warszawa';
    console.log('📍 URL:', url);
    console.log('⏳ Ładuję stronę...\n');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Czekaj na załadowanie
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Zrób screenshot
    await page.screenshot({ path: 'otodom-debug.png', fullPage: false });
    console.log('📸 Screenshot zapisany: otodom-debug.png\n');

    // Wyciągnij HTML
    const html = await page.content();
    fs.writeFileSync('otodom-debug.html', html);
    console.log('💾 HTML zapisany: otodom-debug.html\n');

    // Sprawdź różne możliwe selektory
    console.log('🔍 Testuję selektory:\n');

    const selectors = [
      '[data-cy="listing-item"]',
      '[data-cy="listing-item-link"]',
      '[data-cy="search.listing"]',
      'article[data-cy*="listing"]',
      'li[data-cy*="listing"]',
      'div[data-cy*="listing"]',
      '[class*="listing"]',
      '[class*="ad-card"]',
      'article',
      'li[role="listitem"]',
      '[data-testid*="listing"]',
      'a[href*="/pl/oferta/"]'
    ];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ ${selector} - znaleziono ${elements.length} elementów`);
          
          // Pokaż przykładowy HTML
          if (elements.length > 0) {
            const html = await page.evaluate(el => el.outerHTML, elements[0]);
            console.log(`   Przykład HTML (pierwsze 200 znaków):`);
            console.log(`   ${html.substring(0, 200)}...\n`);
          }
        } else {
          console.log(`❌ ${selector} - brak elementów`);
        }
      } catch (e) {
        console.log(`❌ ${selector} - błąd: ${e.message}`);
      }
    }

    // Sprawdź wszystkie article/li tags
    console.log('\n🔍 Wszystkie <article> tagi:');
    const articles = await page.$$('article');
    console.log(`   Znaleziono: ${articles.length}`);
    if (articles.length > 0) {
      const articleHtml = await page.evaluate(el => el.outerHTML, articles[0]);
      console.log(`   Pierwszy article HTML:\n${articleHtml.substring(0, 500)}\n`);
    }

    console.log('\n🔍 Wszystkie <li> tagi:');
    const listItems = await page.$$('li');
    console.log(`   Znaleziono: ${listItems.length}`);

    // Sprawdź data-cy attributes
    console.log('\n🔍 Wszystkie data-cy attributes:');
    const dataCyAttrs = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-cy]');
      const attrs = new Set();
      elements.forEach(el => attrs.add(el.getAttribute('data-cy')));
      return Array.from(attrs).sort();
    });
    console.log('   Znalezione data-cy:', dataCyAttrs.slice(0, 20));

    console.log('\n✅ Debug zakończony! Przeglądarka pozostanie otwarta.');
    console.log('📝 Sprawdź pliki:');
    console.log('   - otodom-debug.png');
    console.log('   - otodom-debug.html\n');

    // Nie zamykaj przeglądarki - pozwól userowi zobaczyć
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minuta

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await browser.close();
  }
}

debugOtodom().catch(console.error);
