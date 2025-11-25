const cron = require('node-cron');
const Property = require('../models/Property');

// Wybór klienta OLX na podstawie konfiguracji
const OLXApiClient = process.env.OLX_USE_MOCK === 'true' 
  ? require('./olxMockClient')
  : require('./olxApiClient');

const OtodomScraper = require('./scrapers/otodomScraper');

class ScraperService {
  constructor() {
    this.olxClient = new OLXApiClient();
    this.otodomScraper = new OtodomScraper();
    this.isRunning = false;
    this.cronJob = null;
    
    // Konfiguracja scrapowania
    this.config = {
      cities: ['warszawa', 'krakow', 'wroclaw', 'poznan', 'gdansk'],
      maxPagesPerCity: 3,
      delayBetweenRequests: 2000,
      propertiesPerPage: 50,
    };
  }

  /**
   * Uruchamia jednorazowy scraping
   * @param {Object} options - opcje scrapowania
   */
  async runOnce(options = {}) {
    if (this.isRunning) {
      console.log('⚠️  Scraping już jest w trakcie...');
      return { success: false, message: 'Scraping already in progress' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const results = {
      olx: { success: 0, failed: 0, skipped: 0 },
      otodom: { success: 0, failed: 0, skipped: 0 }
    };

    try {
      console.log('🚀 Rozpoczynam scraping ogłoszeń...');

      const cities = options.cities || this.config.cities;
      const maxPages = options.maxPages || this.config.maxPagesPerCity;

      // Scraping OLX (Official API)
      if (options.sources?.includes('olx') || !options.sources) {
        console.log('\n📍 === OLX Partner API === ');
        for (const city of cities) {
          for (let page = 1; page <= maxPages; page++) {
            try {
              await this.delay(this.config.delayBetweenRequests);
              
              const offset = (page - 1) * this.config.propertiesPerPage;
              
              // Użyj oficjalnego API
              const properties = await this.olxClient.getProperties({
                city: city,
                limit: this.config.propertiesPerPage,
                offset: offset,
                category: 'nieruchomosci'
              });

              for (const property of properties) {
                try {
                  await this.saveProperty(property);
                  results.olx.success++;
                } catch (err) {
                  if (err.message.includes('już istnieje') || err.message.includes('unique')) {
                    results.olx.skipped++;
                  } else {
                    results.olx.failed++;
                    console.error(`❌ Błąd zapisu OLX: ${err.message}`);
                  }
                }
              }

              console.log(`✅ OLX ${city} strona ${page}: ${properties.length} ogłoszeń`);
              
              // Jeśli otrzymaliśmy mniej niż limit, to nie ma więcej stron
              if (properties.length < this.config.propertiesPerPage) {
                break;
              }
            } catch (err) {
              console.error(`❌ Błąd pobierania z OLX API ${city} strona ${page}: ${err.message}`);
              
              if (err.message.includes('rate limit')) {
                console.log('⏸️  Rate limit - przerywam scraping OLX');
                break;
              }
            }
          }
        }
      }

      // Scraping Otodom
      if (options.sources?.includes('otodom') || !options.sources) {
        console.log('\n📍 === OTODOM === ');
        for (const city of cities) {
          for (let page = 1; page <= maxPages; page++) {
            try {
              await this.delay(this.config.delayBetweenRequests);
              
              const listings = await this.otodomScraper.scrapeListings(
                'sprzedaz',
                'mieszkanie',
                city,
                page
              );

              for (const listing of listings) {
                try {
                  // Opcjonalnie: pobierz pełne szczegóły
                  let details = null;
                  if (this.config.fullDetailsEnabled && listing.url) {
                    await this.delay(this.config.delayBetweenRequests);
                    details = await this.otodomScraper.scrapeDetails(listing.url);
                  }

                  await this.otodomScraper.saveToDatabase(listing, details);
                  results.otodom.success++;
                } catch (err) {
                  if (err.message.includes('już istnieje')) {
                    results.otodom.skipped++;
                  } else {
                    results.otodom.failed++;
                    console.error(`❌ Błąd zapisu Otodom: ${err.message}`);
                  }
                }
              }

              console.log(`✅ Otodom ${city} strona ${page}: ${listings.length} ogłoszeń`);
            } catch (err) {
              console.error(`❌ Błąd scrapowania Otodom ${city} strona ${page}: ${err.message}`);
              
              if (err.message.includes('Rate limit')) {
                console.log('⏸️  Rate limit - przerywam scraping Otodom');
                break;
              }
            }
          }
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n✅ === PODSUMOWANIE === ');
      console.log(`⏱️  Czas trwania: ${duration}s`);
      console.log(`📊 OLX: ${results.olx.success} zapisanych, ${results.olx.skipped} pominięto, ${results.olx.failed} błędów`);
      console.log(`📊 Otodom: ${results.otodom.success} zapisanych, ${results.otodom.skipped} pominięto, ${results.otodom.failed} błędów`);

      return {
        success: true,
        duration,
        results
      };

    } catch (error) {
      console.error('❌ Krytyczny błąd podczas scrapowania:', error);
      return {
        success: false,
        error: error.message,
        results
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Uruchamia cron job dla automatycznego scrapowania
   * @param {string} schedule - cron schedule (domyślnie: codziennie o 2:00)
   */
  startCronJob(schedule = '0 2 * * *') {
    if (this.cronJob) {
      console.log('⚠️  Cron job już jest uruchomiony');
      return;
    }

    console.log(`⏰ Uruchamiam cron job: ${schedule}`);
    console.log('   (Domyślnie: codziennie o 2:00 AM)');
    
    this.cronJob = cron.schedule(schedule, async () => {
      console.log('\n⏰ Cron job: rozpoczynam automatyczny scraping...');
      await this.runOnce();
    });

    console.log('✅ Cron job aktywny');
  }

  /**
   * Zatrzymuje cron job
   */
  stopCronJob() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️  Cron job zatrzymany');
    }
  }

  /**
   * Pomocnicza metoda delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Zapisuje nieruchomość do bazy danych
   * @param {Object} propertyData - Znormalizowane dane nieruchomości
   */
  async saveProperty(propertyData) {
    try {
      // Sprawdź czy istnieje
      const existing = await Property.findOne({
        where: {
          source: propertyData.source,
          external_id: propertyData.externalId
        }
      });

      if (existing) {
        // Opcjonalnie: zaktualizuj dane
        // await existing.update({ price: propertyData.price, ... });
        throw new Error(`Ogłoszenie ${propertyData.externalId} już istnieje w bazie`);
      }

      // Przygotuj dane zgodne z modelem
      const dbData = {
        source: propertyData.source,
        external_id: propertyData.externalId,
        title: propertyData.title,
        description: propertyData.description,
        price: propertyData.price,
        currency: propertyData.currency || 'PLN',
        area: propertyData.area,
        rooms: propertyData.rooms,
        property_type: propertyData.propertyType,
        transaction_type: propertyData.transactionType || 'sale',
        address: propertyData.address,
        city: propertyData.city,
        district: propertyData.district,
        location: propertyData.location,
        images: propertyData.images || [],
        url: propertyData.url,
        contact_info: propertyData.contactInfo ? JSON.stringify(propertyData.contactInfo) : null,
        is_active: propertyData.isActive !== false,
        published_at: propertyData.publishedAt || new Date()
      };

      await Property.create(dbData);
      console.log(`✅ Zapisano: ${propertyData.title} (${propertyData.externalId})`);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Zwraca status serwisu
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronJobActive: this.cronJob !== null,
      config: this.config,
      mode: process.env.OLX_USE_MOCK === 'true' ? 'MOCK' : 'PRODUCTION'
    };
  }

  /**
   * Aktualizuje konfigurację
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Konfiguracja zaktualizowana:', this.config);
  }
}

// Singleton instance
const scraperService = new ScraperService();

module.exports = scraperService;
