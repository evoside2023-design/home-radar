const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/**
 * Debug Otodom v2 - dłuższe czekanie i scroll
 */
async function debugOtodomV2() {
  console.log('🔍 Otodom Debug v2 - z długim czekaniem...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920x1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    const url = 'https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/warszawa';
    console.log('📍 URL:', url);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Strona załadowana');

    // Czekaj DŁUGO na rendering JS
    console.log('⏳ Czekam 10s na JavaScript rendering...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Scroll down (lazy loading)
    console.log('📜 Scrolluję stronę...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 2000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // Czekaj jeszcze
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Screenshot
    await page.screenshot({ path: 'otodom-debug-v2.png', fullPage: false });
    console.log('📸 Screenshot: otodom-debug-v2.png\n');

    // Testuj selektory ponownie
    console.log('🔍 Testuję selektory po scrollu:\n');

    const selectorsToTest = [
      'article',
      'li[data-cy]',
      'div[data-cy*="listing"]',
      'a[href*="/oferta/"]',
      '[class*="css-"]', // Otodom używa CSS-in-JS
      'ul[role="list"] > li',
      'div[role="article"]',
      '[data-testid]'
    ];

    for (const selector of selectorsToTest) {
      const count = await page.$$eval(selector, els => els.length);
      if (count > 0) {
        console.log(`✅ ${selector} - ${count} elementów`);
        
        // Pokaż pierwszy element
        const firstHtml = await page.$$eval(selector, els => 
          els[0] ? els[0].outerHTML.substring(0, 300) : ''
        );
        console.log(`   ${firstHtml}...\n`);
      }
    }

    // Sprawdź wszystkie linki
    console.log('🔗 Wszystkie linki z href="/pl/oferta/":');
    const offerLinks = await page.$$eval('a[href*="/pl/oferta/"]', links => 
      links.slice(0, 5).map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 50)
      }))
    );
    console.log(offerLinks);

    // Sprawdź czy są linki do ogłoszeń
    console.log('\n🔍 Szukam linków do ogłoszeń...');
    const allLinks = await page.$$eval('a', links => 
      links
        .map(a => a.href)
        .filter(href => href.includes('/oferta/'))
        .slice(0, 10)
    );
    console.log('Znaleziono linki:', allLinks.length);
    allLinks.forEach(link => console.log('  -', link));

    console.log('\n⏸️ Przeglądarka pozostanie otwarta przez 2 minuty...');
    await new Promise(resolve => setTimeout(resolve, 120000));

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

debugOtodomV2().catch(console.error);
