/**
 * Real-Time Property Scraper
 * Scrapes ALL properties for a given search query from OLX and Otodom
 * Returns combined results without storing in database
 */

const PropertyScraper = require('./propertyScraper');

class RealTimeScraper {
  constructor() {
    this.scraper = null;
  }

  /**
   * Initialize the scraper (creates PropertyScraper instance)
   */
  async initialize() {
    this.scraper = new PropertyScraper({
      headless: true,
      timeout: 5000,   // Ultra fast - 5s timeout
      delay: 0         // No delay between requests
    });
    await this.scraper.initialize();
  }

  /**
   * Search properties in real-time (no database)
   * @param {Object} params - Search parameters
   * @param {string} params.city - City name (e.g., 'sopot')
   * @param {number} params.maxPages - Maximum pages to scrape per source (default: 10)
   * @returns {Promise<Array>} Combined results from all sources
   */
  async search({ city, maxPages = 10 }) {
    console.log(`🔍 Real-time search: ${city}`);
    console.log(`📄 Max pages per source: ${maxPages}\n`);

    const startTime = Date.now();

    try {
      // Initialize scraper if not already done
      if (!this.scraper) {
        await this.initialize();
      }

      // Scrape both sources in parallel
      const [olxResults, otodomResults] = await Promise.all([
        this.scrapeAllPages('olx', city, maxPages),
        this.scrapeAllPages('otodom', city, maxPages)
      ]);

      await this.scraper.close();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const total = olxResults.length + otodomResults.length;

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ WYNIKI WYSZUKIWANIA:`);
      console.log(`   OLX: ${olxResults.length} ogłoszeń`);
      console.log(`   Otodom: ${otodomResults.length} ogłoszeń`);
      console.log(`   RAZEM: ${total} ogłoszeń`);
      console.log(`   Czas: ${elapsed}s`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return {
        results: [...olxResults, ...otodomResults],
        stats: {
          total,
          olx: olxResults.length,
          otodom: otodomResults.length,
          duration: parseFloat(elapsed)
        }
      };

    } catch (error) {
      console.error('❌ Search error:', error.message);
      if (this.scraper) {
        await this.scraper.close();
      }
      throw error;
    }
  }

  /**
   * Scrape all pages from a single source
   */
  async scrapeAllPages(source, city, maxPages) {
    console.log(`📍 ${source.toUpperCase()}: Rozpoczynam scraping...`);

    const allResults = [];
    let page = 1;
    let consecutiveEmpty = 0;

    while (page <= maxPages) {
      try {
        let pageResults = [];

        if (source === 'olx') {
          pageResults = await this.scraper.scrapeOLX(city, page);
        } else if (source === 'otodom') {
          pageResults = await this.scraper.scrapeOtodom(city, page);
        }

        if (pageResults.length === 0) {
          consecutiveEmpty++;
          console.log(`   Page ${page}: 0 results (empty ${consecutiveEmpty}/2)`);
          
          // Stop if 2 consecutive empty pages
          if (consecutiveEmpty >= 2) {
            console.log(`   ⚠️  Brak więcej ogłoszeń, kończę scraping`);
            break;
          }
        } else {
          consecutiveEmpty = 0;
          allResults.push(...pageResults);
          console.log(`   Page ${page}: +${pageResults.length} (total: ${allResults.length})`);
        }

        page++;

        // Rate limiting between pages
        if (page <= maxPages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`   ❌ Page ${page} error:`, error.message);
        consecutiveEmpty++;
        
        if (consecutiveEmpty >= 2) break;
        page++;
      }
    }

    console.log(`✅ ${source.toUpperCase()}: Ukończono - ${allResults.length} ogłoszeń\n`);
    return allResults;
  }

  /**
   * Cleanup
   */
  async close() {
    if (this.scraper) {
      await this.scraper.close();
    }
  }
}

module.exports = RealTimeScraper;
