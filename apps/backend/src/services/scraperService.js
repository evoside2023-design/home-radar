const PropertyScraper = require('./propertyScraper');
const { Property } = require('../models');
const { sequelize } = require('../config/database');

/**
 * ScraperService - zarządza procesem scraping'u
 * Używa Puppeteer do pobierania ogłoszeń z OLX i Otodom
 */
class ScraperService {
  constructor() {
    this.scraper = new PropertyScraper({
      headless: true, // false dla debugowania
      delay: 3000, // 3s między requestami
      timeout: 30000
    });

    this.stats = {
      olx: { success: 0, failed: 0, skipped: 0 },
      otodom: { success: 0, failed: 0, skipped: 0 }
    };
  }

  /**
   * Scrapuj OLX
   */
  async scrapeOLX(city = 'warszawa', pages = 1) {
    console.log(`🔍 OLX: Scrapuję ${city}, strony: ${pages}`);

    try {
      const properties = await this.scraper.scrapeMultiplePages('olx', city, 1, pages);

      console.log(`✅ OLX: Pobrano ${properties.length} ogłoszeń`);

      // Zapisz do bazy
      for (const propertyData of properties) {
        await this.saveProperty(propertyData);
      }

      return this.stats.olx;
    } catch (error) {
      console.error('❌ Błąd OLX:', error.message);
      throw error;
    } finally {
      await this.scraper.close();
    }
  }

  /**
   * Scrapuj Otodom
   */
  async scrapeOtodom(city = 'warszawa', pages = 1) {
    console.log(`🔍 Otodom: Scrapuję ${city}, strony: ${pages}`);

    try {
      const properties = await this.scraper.scrapeMultiplePages('otodom', city, 1, pages);

      console.log(`✅ Otodom: Pobrano ${properties.length} ogłoszeń`);

      // Zapisz do bazy
      for (const propertyData of properties) {
        await this.saveProperty(propertyData);
      }

      return this.stats.otodom;
    } catch (error) {
      console.error('❌ Błąd Otodom:', error.message);
      throw error;
    } finally {
      await this.scraper.close();
    }
  }

  /**
   * Scrapuj wszystko
   */
  async scrapeAll(options = {}) {
    const city = options.city || 'warszawa';
    const pages = options.pages || 2;

    console.log('\n🚀 === SCRAPING START ===');
    const startTime = Date.now();

    try {
      // OLX
      console.log('\n📍 OLX:');
      await this.scrapeOLX(city, pages);

      // Delay między źródłami
      console.log('\n⏳ Czekam 5s przed Otodom...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Otodom
      console.log('\n📍 Otodom:');
      await this.scrapeOtodom(city, pages);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n✅ === SCRAPING COMPLETE ===');
      console.log(`⏱️  Czas trwania: ${duration}s`);
      console.log(`📊 OLX: ${this.stats.olx.success} zapisanych, ${this.stats.olx.skipped} pominięto, ${this.stats.olx.failed} błędów`);
      console.log(`📊 Otodom: ${this.stats.otodom.success} zapisanych, ${this.stats.otodom.skipped} pominięto, ${this.stats.otodom.failed} błędów`);

      return {
        success: true,
        duration,
        results: this.stats
      };

    } catch (error) {
      console.error('❌ Krytyczny błąd:', error);
      return {
        success: false,
        error: error.message,
        results: this.stats
      };
    } finally {
      await this.scraper.close();
    }
  }

  /**
   * Zapisz property do bazy
   */
  async saveProperty(propertyData) {
    try {
      // Sprawdź czy już istnieje
      const existing = await Property.findOne({
        where: {
          source: propertyData.source,
          external_id: propertyData.external_id
        }
      });

      if (existing) {
        this.stats[propertyData.source].skipped++;
        return;
      }

      // Przygotuj location (PostGIS)
      let location = null;
      if (propertyData.latitude && propertyData.longitude) {
        location = sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify({
          type: 'Point',
          coordinates: [propertyData.longitude, propertyData.latitude]
        }));
      }

      // Zapisz
      await Property.create({
        source: propertyData.source,
        external_id: propertyData.external_id,
        external_url: propertyData.external_url,
        title: propertyData.title,
        description: propertyData.description,
        price: propertyData.price,
        area: propertyData.area,
        rooms: propertyData.rooms,
        property_type: propertyData.property_type,
        transaction_type: propertyData.transaction_type,
        city: propertyData.city,
        district: propertyData.district,
        location: location,
        images: propertyData.images,
        published_at: propertyData.published_at,
        scraped_at: propertyData.scraped_at
      });

      this.stats[propertyData.source].success++;
      console.log(`  ✅ Zapisano: ${propertyData.title.substring(0, 50)}...`);

    } catch (error) {
      this.stats[propertyData.source].failed++;
      console.error(`  ❌ Błąd zapisu:`, error.message);
    }
  }

  /**
   * Get scraper status
   */
  getStatus() {
    return {
      mode: 'WEB_SCRAPING',
      puppeteer: 'enabled',
      stats: this.stats
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      olx: { success: 0, failed: 0, skipped: 0 },
      otodom: { success: 0, failed: 0, skipped: 0 }
    };
  }
}

module.exports = new ScraperService();
