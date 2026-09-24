const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');

// Dodaj stealth plugin (obejście Cloudflare/bot detection)
puppeteer.use(StealthPlugin());

/**
 * Advanced Web Scraper dla OLX i Otodom
 * Używa Puppeteer + Stealth do obejścia Cloudflare
 * 
 * Strategia:
 * 1. Puppeteer renderuje stronę (jak prawdziwa przeglądarka)
 * 2. Stealth plugin ukrywa ślady automatyzacji
 * 3. Czeka na załadowanie ogłoszeń (AJAX)
 * 4. Wyciąga HTML i parsuje Cheerio
 * 5. Normalizuje dane do unified schema
 */
class PropertyScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false, // domyślnie headless
      timeout: options.timeout || 30000,
      delay: options.delay || 2000, // delay między requestami
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    this.browser = null;
    this.stats = {
      success: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * Inicjalizacja przeglądarki
   */
  async initialize() {
    if (this.browser) return;

    console.log('🚀 Uruchamiam Puppeteer...');
    
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    console.log('✅ Przeglądarka uruchomiona');
  }

  /**
   * Zamknięcie przeglądarki
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Przeglądarka zamknięta');
    }
  }

  /**
   * Scrape OLX listings
   */
  async scrapeOLX(city = 'warszawa', page = 1, onResult = null) {
    await this.initialize();

    const url = `https://www.olx.pl/nieruchomosci/${city}/?page=${page}`;
    console.log(`🔍 OLX: ${url}`);

    try {
      const html = await this.fetchWithPuppeteer(url, {
        waitForSelector: '[data-cy="l-card"]' // OLX listing card
        // NO extra delay
      });

      const $ = cheerio.load(html);
      const properties = [];
      const maxResults = 5;  // Limit to 5 results per page

      // Parsuj każde ogłoszenie (only first 5)
      $('[data-cy="l-card"]').each((index, element) => {
        if (properties.length >= maxResults) return false;  // Stop after 5
        
        try {
          const property = this.parseOLXListing($, element);
          if (property) {
            properties.push(property);
            // Progressive callback - send each property immediately
            if (onResult) {
              onResult(property);
            }
          }
        } catch (error) {
          console.error('❌ Błąd parsowania OLX listing:', error.message);
          this.stats.failed++;
        }
      });

      this.stats.success += properties.length;
      console.log(`✅ OLX: Znaleziono ${properties.length} ogłoszeń`);

      return properties;

    } catch (error) {
      console.error('❌ OLX scraping error:', error.message);
      throw error;
    }
  }

  /**
   * Scrape Otodom listings
   */
  async scrapeOtodom(city = 'warszawa', page = 1, onResult = null) {
    await this.initialize();

    // Otodom: URL dla miasta wymaga slug województwa; dla nieznanych miast fallback na całą Polskę
    const url = this.buildOtodomUrl(city, page);
    console.log(`🔍 Otodom: ${url}`);

    try {
      const html = await this.fetchWithPuppeteer(url, {
        waitForFunction: '() => document.querySelectorAll("a[href*=\\"/pl/oferta/\\"]").length > 0',
        extraDelay: 200  // Minimal 200ms for AJAX
      });

      const $ = cheerio.load(html);
      const properties = [];
      const seenIds = new Set();
      const maxResults = 5;  // Limit to 5 results per page

      // Otodom używa prostych <a> linków do ofert (only first 5)
      $('a[href*="/pl/oferta/"]').each((index, element) => {
        if (properties.length >= maxResults) return false;  // Stop after 5
        
        try {
          const property = this.parseOtodomListing($, element);
          if (property && property.title && !seenIds.has(property.external_id)) {
            seenIds.add(property.external_id);
            properties.push(property);
            // Progressive callback - send each property immediately
            if (onResult) {
              onResult(property);
            }
          }
        } catch (error) {
          console.error('❌ Błąd parsowania Otodom listing:', error.message);
          this.stats.failed++;
        }
      });

      this.stats.success += properties.length;
      console.log(`✅ Otodom: Znaleziono ${properties.length} ogłoszeń`);

      return properties;

    } catch (error) {
      console.error('❌ Otodom scraping error:', error.message);
      throw error;
    }
  }

  /**
   * Buduje URL listingu Otodom dla miasta.
   * Otodom używa ścieżki /{wojewodztwo}/{powiat}/{gmina}/{miasto}; dla miast na prawach
   * powiatu segmenty się powtarzają. Dla miast spoza mapy: cała Polska + parametr wyszukiwania.
   */
  buildOtodomUrl(city = 'warszawa', page = 1) {
    const slug = String(city).trim().toLowerCase();
    const base = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie';
    const known = {
      warszawa: 'mazowieckie/warszawa/warszawa/warszawa',
      krakow: 'malopolskie/krakow/krakow/krakow',
      wroclaw: 'dolnoslaskie/wroclaw/wroclaw/wroclaw',
      poznan: 'wielkopolskie/poznan/poznan/poznan',
      gdansk: 'pomorskie/gdansk/gdansk/gdansk',
      gdynia: 'pomorskie/gdynia/gdynia/gdynia',
      sopot: 'pomorskie/sopot/sopot/sopot',
      lodz: 'lodzkie/lodz/lodz/lodz',
      szczecin: 'zachodniopomorskie/szczecin/szczecin/szczecin',
      lublin: 'lubelskie/lublin/lublin/lublin',
      katowice: 'slaskie/katowice/katowice/katowice',
      bydgoszcz: 'kujawsko--pomorskie/bydgoszcz/bydgoszcz/bydgoszcz',
      bialystok: 'podlaskie/bialystok/bialystok/bialystok',
      rzeszow: 'podkarpackie/rzeszow/rzeszow/rzeszow',
      torun: 'kujawsko--pomorskie/torun/torun/torun',
      olsztyn: 'warminsko--mazurskie/olsztyn/olsztyn/olsztyn',
      kielce: 'swietokrzyskie/kielce/kielce/kielce',
      opole: 'opolskie/opole/opole/opole'
    };

    if (known[slug]) {
      return `${base}/${known[slug]}?page=${page}`;
    }
    return `${base}/cala-polska?locations=${encodeURIComponent(slug)}&page=${page}`;
  }

  /**
   * Fetch page with Puppeteer (obejście Cloudflare)
   */
  async fetchWithPuppeteer(url, options = {}) {
    const page = await this.browser.newPage();

    try {
      // Set realistic viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      // Navigate - use domcontentloaded for fastest loading
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeout
      });

      // Wait for selector (if specified) - MINIMAL timeout
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: 1000  // Just 1 second
        }).catch(() => {
          console.warn('⚠️ Selector nie znaleziony, kontynuuję...');
        });
      }

      // Wait for function (dla dynamicznych stron) - MINIMAL
      if (options.waitForFunction) {
        await page.waitForFunction(options.waitForFunction, {
          timeout: 1500  // Just 1.5s
        }).catch(() => {
          console.warn('⚠️ Wait function timeout, kontynuuję...');
        });
      }

      // NO SCROLLING - skip for speed

      // NO EXTRA DELAY
      const delay = options.extraDelay !== undefined ? options.extraDelay : 0;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Get HTML
      const html = await page.content();

      return html;

    } finally {
      await page.close();
    }
  }

  /**
   * Auto scroll page (load lazy content) - faster version
   */
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;  // Increased from 100 for faster scroll
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50);  // Reduced from 100ms to 50ms
      });
    });
  }

  /**
   * Parse pojedynczego OLX listing
   */
  parseOLXListing($, element) {
    const $el = $(element);

    // URL i ID
    const link = $el.find('a').first().attr('href');
    if (!link) return null;

    const fullUrl = link.startsWith('http') ? link : `https://www.olx.pl${link}`;
    const externalId = this.extractOLXId(fullUrl);

    // Tytuł
    const title = $el.find('h6, h4, [data-cy="l-card-title"]').first().text().trim();

    // Cena
    const priceText = $el.find('[data-testid="ad-price"]').first().text().trim();
    const price = this.parsePrice(priceText);

    // Lokalizacja
    const locationText = $el.find('[data-testid="location-date"]').first().text().trim();
    const location = this.parseLocation(locationText);

    // Obrazek
    const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');

    // Metadata z tytułu
    const metadata = this.extractMetadataFromTitle(title);

    return {
      source: 'olx',
      external_id: externalId,
      external_url: fullUrl,
      title,
      description: '', // trzeba scrape'ować stronę szczegółów
      price,
      area: metadata.area,
      rooms: metadata.rooms,
      property_type: metadata.propertyType || 'apartment',
      transaction_type: metadata.transactionType || 'sale',
      city: location.city,
      district: location.district,
      images: imageUrl ? [{ url: imageUrl }] : [],
      published_at: new Date(),
      scraped_at: new Date()
    };
  }

  /**
   * Parse pojedynczego Otodom listing
   */
  parseOtodomListing($, element) {
    const $el = $(element);

    // URL i ID
    const link = $el.attr('href');
    if (!link || !link.includes('/pl/oferta/')) return null;

    const fullUrl = link.startsWith('http') ? link : `https://www.otodom.pl${link}`;
    const externalId = this.extractOtodomId(fullUrl);

    // Znajdź parent container z danymi
    const $parent = $el.closest('div[data-cy*="listing"], li, article').length > 0 
      ? $el.closest('div[data-cy*="listing"], li, article') 
      : $el.parent();

    // Tytuł (może być w różnych miejscach)
    let title = $el.find('h3, h2, p[class*="title"]').first().text().trim() ||
                $el.text().trim() ||
                $parent.find('h3, h2, p[class*="title"]').first().text().trim();

    // Jeśli title jest za długi, skróć
    if (title.length > 200) {
      title = title.substring(0, 200) + '...';
    }

    if (!title || title.length < 5) return null; // Skip invalid

    // Cena - szukaj w parent lub siblings
    const priceText = $parent.find('[class*="price"], span[class*="Price"]').first().text().trim() ||
                      $el.siblings('[class*="price"]').first().text().trim();
    const price = this.parsePrice(priceText);

    // Powierzchnia - regex z tekstu
    const fullText = $parent.text();
    const area = this.extractAreaFromText(fullText);

    // Pokoje - regex z tekstu
    const rooms = this.extractRoomsFromText(fullText);

    // Lokalizacja
    const locationText = $parent.find('[class*="location"], [class*="Location"]').first().text().trim();
    const location = this.parseLocation(locationText);

    // Obrazek
    const imageUrl = $parent.find('img').first().attr('src') || 
                     $parent.find('img').first().attr('data-src') ||
                     $el.find('img').first().attr('src');

    return {
      source: 'otodom',
      external_id: externalId,
      external_url: fullUrl,
      title: title.replace(/\s+/g, ' ').trim(), // Clean whitespace
      description: '', // trzeba scrape'ować stronę szczegółów
      price,
      area,
      rooms,
      property_type: 'apartment', // domyślnie
      transaction_type: fullUrl.includes('wynajem') ? 'rent' : 'sale',
      city: location.city,
      district: location.district,
      images: imageUrl ? [{ url: imageUrl }] : [],
      published_at: new Date(),
      scraped_at: new Date()
    };
  }

  /**
   * Wyciągnij ID z URL OLX
   */
  extractOLXId(url) {
    const match = url.match(/ID(\d+)/);
    return match ? match[1] : url.split('/').pop().split('-').pop().replace('.html', '');
  }

  /**
   * Wyciągnij ID z URL Otodom
   */
  extractOtodomId(url) {
    const match = url.match(/ID([a-zA-Z0-9]+)/);
    return match ? match[1] : url.split('/').pop().split('-').shift();
  }

  /**
   * Parse ceny
   */
  parsePrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^\d]/g, '');
    const price = parseInt(cleaned);
    return price > 0 ? price : null;
  }

  /**
   * Parse powierzchni
   */
  parseArea(text) {
    if (!text) return null;
    const match = text.match(/(\d+[.,]?\d*)\s*m/);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  /**
   * Parse liczby pokoi
   */
  parseRooms(text) {
    if (!text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parse lokalizacji
   */
  parseLocation(text) {
    if (!text) return { city: null, district: null };

    const parts = text.split(',').map(p => p.trim());
    
    return {
      city: parts[0] || null,
      district: parts[1] || null
    };
  }

  /**
   * Wyciągnij metadata z tytułu (powierzchnia, pokoje)
   */
  extractMetadataFromTitle(title) {
    const metadata = {
      area: null,
      rooms: null,
      propertyType: null,
      transactionType: null
    };

    // Powierzchnia (np. "65m²", "65 m2")
    const areaMatch = title.match(/(\d+)\s*m[²2]/i);
    if (areaMatch) {
      metadata.area = parseInt(areaMatch[1]);
    }

    // Pokoje (np. "3 pokoje", "3-pokojowe")
    const roomsMatch = title.match(/(\d+)[\s-]*(pokojowe|pokoi|pokoje)/i);
    if (roomsMatch) {
      metadata.rooms = parseInt(roomsMatch[1]);
    }

    // Typ nieruchomości
    if (title.match(/\bmieszkanie\b|\bapartament\b/i)) {
      metadata.propertyType = 'apartment';
    } else if (title.match(/\bdom\b|\bwilla\b/i)) {
      metadata.propertyType = 'house';
    } else if (title.match(/\bdziałka\b|\bgrunty?\b/i)) {
      metadata.propertyType = 'land';
    }

    // Typ transakcji
    if (title.match(/\bwynajem\b|\bdo wynajęcia\b/i)) {
      metadata.transactionType = 'rent';
    } else if (title.match(/\bsprzedaż\b|\bsprzedam\b/i)) {
      metadata.transactionType = 'sale';
    }

    return metadata;
  }

  /**
   * Wyciągnij powierzchnię z tekstu
   */
  extractAreaFromText(text) {
    const match = text.match(/(\d+[.,]?\d*)\s*m[²2]/);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  /**
   * Wyciągnij pokoje z tekstu
   */
  extractRoomsFromText(text) {
    const match = text.match(/(\d+)\s*(pokoi|pokoje|pokojowe|pok\.)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Batch scraping z delay
   */
  async scrapeMultiplePages(source, city, startPage = 1, endPage = 3) {
    const allProperties = [];

    for (let page = startPage; page <= endPage; page++) {
      try {
        console.log(`\n📄 Strona ${page}/${endPage}...`);

        let properties;
        if (source === 'olx') {
          properties = await this.scrapeOLX(city, page);
        } else if (source === 'otodom') {
          properties = await this.scrapeOtodom(city, page);
        }

        allProperties.push(...properties);

        // Delay między stronami
        if (page < endPage) {
          console.log(`⏳ Czekam ${this.options.delay}ms przed następną stroną...`);
          await new Promise(resolve => setTimeout(resolve, this.options.delay));
        }

      } catch (error) {
        console.error(`❌ Błąd na stronie ${page}:`, error.message);
        this.stats.failed++;
      }
    }

    return allProperties;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      total: this.stats.success + this.stats.failed + this.stats.skipped
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = { success: 0, failed: 0, skipped: 0 };
  }
}

module.exports = PropertyScraper;
