const MetadataExtractor = require('./metadataExtractor');
const { Property } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Property Submission Service
 * Obsługuje user-generated submissions linków do ogłoszeń
 * 
 * Flow:
 * 1. User wkleja link (OLX/Otodom/Gratka)
 * 2. Walidacja URL
 * 3. Sprawdzenie czy już istnieje w bazie
 * 4. Ekstrakcja metadanych (Open Graph)
 * 5. Zapis do bazy jako external property
 * 6. Punkty dla użytkownika (gamification)
 */
class PropertySubmissionService {
  constructor() {
    this.metadataExtractor = new MetadataExtractor();
    
    // Supported sources
    this.supportedSources = ['olx', 'otodom', 'gratka', 'morizon'];
  }

  /**
   * Submit property link by user
   * @param {string} url - URL ogłoszenia
   * @param {number} userId - ID użytkownika (opcjonalne dla gości)
   * @returns {Promise<Object>} Property object
   */
  async submitPropertyLink(url, userId = null) {
    // 1. Walidacja URL
    if (!this.metadataExtractor.isValidPropertyUrl(url)) {
      throw new Error('Nieprawidłowy URL. Wspieramy: OLX, Otodom, Gratka, Morizon');
    }

    // 2. Sprawdź czy już istnieje
    const existing = await this.findExistingProperty(url);
    if (existing) {
      return {
        status: 'exists',
        property: existing,
        message: 'To ogłoszenie już jest w bazie'
      };
    }

    // 3. Ekstrakcja metadanych
    console.log('🔍 Wyciągam metadane z:', url);
    const metadata = await this.metadataExtractor.extractFromUrl(url);

    // 4. Zapis do bazy
    const property = await this.saveProperty(metadata, userId);

    // 5. Punkty dla użytkownika (TODO: implement gamification)
    if (userId) {
      await this.awardPoints(userId, 'property_submission');
    }

    return {
      status: 'created',
      property,
      message: 'Ogłoszenie dodane pomyślnie'
    };
  }

  /**
   * Sprawdza czy property już istnieje
   */
  async findExistingProperty(url) {
    // Normalizuj URL (usuń query params, trailing slash)
    const normalizedUrl = this.normalizeUrl(url);

    return await Property.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { external_url: normalizedUrl },
          { external_url: url }
        ]
      }
    });
  }

  /**
   * Zapisuje property do bazy
   */
  async saveProperty(metadata, userId) {
    try {
      // Prepare location point (PostGIS)
      let location = null;
      if (metadata.location?.latitude && metadata.location?.longitude) {
        location = {
          type: 'Point',
          coordinates: [metadata.location.longitude, metadata.location.latitude]
        };
      }

      const propertyData = {
        source: metadata.source,
        external_id: metadata.external_id || this.generateExternalId(metadata.external_url),
        external_url: metadata.external_url,
        title: metadata.title,
        description: metadata.description,
        price: metadata.price,
        area: metadata.area,
        rooms: metadata.rooms,
        property_type: this.inferPropertyType(metadata.title, metadata.description),
        transaction_type: this.inferTransactionType(metadata.title, metadata.external_url),
        city: metadata.location?.city,
        district: metadata.location?.district,
        location: location ? sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(location)) : null,
        images: metadata.images || [],
        scraped_at: new Date(),
        published_at: new Date(),
        submitted_by_user_id: userId, // Track who submitted
      };

      const property = await Property.create(propertyData);
      
      console.log('✅ Zapisano property:', property.id, '-', property.title);
      
      return property;
    } catch (error) {
      console.error('❌ Błąd zapisu property:', error);
      throw new Error(`Nie udało się zapisać ogłoszenia: ${error.message}`);
    }
  }

  /**
   * Normalizuje URL (usuwa query params, anchors)
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Generuje external_id z URL jeśli nie ma
   */
  generateExternalId(url) {
    // Wyciągnij ostatnią część URL
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.split('-').pop().replace('.html', '').replace('.php', '');
  }

  /**
   * Wnioskuje typ nieruchomości z tytułu/opisu
   */
  inferPropertyType(title, description) {
    const text = (title + ' ' + description).toLowerCase();

    if (text.match(/\bmieszkanie\b|\bapartament\b/)) return 'apartment';
    if (text.match(/\bdom\b|\bwilla\b/)) return 'house';
    if (text.match(/\bdziałka\b|\bgrunty?\b/)) return 'land';
    if (text.match(/\blokal\b|\bbiuro\b|\bkamienica\b/)) return 'commercial';
    if (text.match(/\bgaraż\b/)) return 'garage';

    return 'apartment'; // default
  }

  /**
   * Wnioskuje typ transakcji
   */
  inferTransactionType(title, url) {
    const text = (title + ' ' + url).toLowerCase();

    if (text.match(/\bwynajem\b|\bnajem\b|\bdo wynajęcia\b/)) return 'rent';
    if (text.match(/\bsprzedaż\b|\bsprzedam\b|\bna sprzedaż\b/)) return 'sale';

    return 'sale'; // default
  }

  /**
   * Award points to user (gamification)
   */
  async awardPoints(userId, action) {
    // TODO: Implement gamification table
    const points = {
      'property_submission': 10,
      'first_submission': 50,
      'verified_submission': 20,
    };

    console.log(`🎯 User ${userId} otrzymał ${points[action]} punktów za ${action}`);
    
    // Przykładowa implementacja:
    // await UserPoints.increment('points', {
    //   by: points[action],
    //   where: { user_id: userId }
    // });
  }

  /**
   * Batch submission (dla importu)
   */
  async submitBatch(urls, userId = null) {
    const results = {
      success: 0,
      failed: 0,
      exists: 0,
      errors: []
    };

    for (const url of urls) {
      try {
        const result = await this.submitPropertyLink(url, userId);
        
        if (result.status === 'created') {
          results.success++;
        } else if (result.status === 'exists') {
          results.exists++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ url, error: error.message });
      }

      // Rate limiting - delay between submissions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Get submission statistics
   */
  async getSubmissionStats(userId = null) {
    const where = userId ? { submitted_by_user_id: userId } : {};

    const stats = {
      total: await Property.count({ where }),
      bySource: await Property.findAll({
        where,
        attributes: [
          'source',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['source']
      }),
      recentSubmissions: await Property.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 10
      })
    };

    return stats;
  }

  /**
   * Validate and enrich existing properties
   * Okresowo sprawdza czy linki działają
   */
  async validateExistingProperties(limit = 50) {
    const properties = await Property.findAll({
      where: {
        external_url: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      order: [['scraped_at', 'ASC']], // Najstarsze najpierw
      limit
    });

    const results = {
      validated: 0,
      updated: 0,
      inactive: 0,
      errors: []
    };

    for (const property of properties) {
      try {
        // Próbuj odświeżyć metadane
        const metadata = await this.metadataExtractor.extractFromUrl(property.external_url);
        
        // Update jeśli się zmieniło
        await property.update({
          title: metadata.title || property.title,
          price: metadata.price || property.price,
          scraped_at: new Date()
        });

        results.validated++;
        results.updated++;
      } catch (error) {
        // Ogłoszenie może być nieaktywne
        if (error.message.includes('404')) {
          await property.update({ 
            status: 'inactive',
            scraped_at: new Date() 
          });
          results.inactive++;
        } else {
          results.errors.push({
            property_id: property.id,
            url: property.external_url,
            error: error.message
          });
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }
}

module.exports = PropertySubmissionService;
