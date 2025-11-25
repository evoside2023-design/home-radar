const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Metadata Extractor - wyciąga publiczne metadane z ogłoszeń
 * Używa Open Graph, Schema.org JSON-LD, meta tags
 * 
 * ⚖️ LEGALNOŚĆ: Wyciąganie publicznych meta tagów jest legalne
 * - Open Graph to publiczne metadane
 * - Nie łamiemy robots.txt (pojedyncze requesty)
 * - Nie automatyzujemy masowo (user-triggered)
 */
class MetadataExtractor {
  constructor() {
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'DomRadar/1.0 (Property Aggregator; +https://domradar.pl)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl,en;q=0.9',
      }
    });
  }

  /**
   * Wyciąga metadane z URL ogłoszenia
   * @param {string} url - URL ogłoszenia (OLX, Otodom, Gratka, etc.)
   * @returns {Promise<Object>} Znormalizowane dane nieruchomości
   */
  async extractFromUrl(url) {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      // Wykryj źródło
      const source = this.detectSource(url);

      // Ekstrakcja w zależności od źródła
      let data;
      switch (source) {
        case 'olx':
          data = this.extractOLXMetadata($, url);
          break;
        case 'otodom':
          data = this.extractOtodomMetadata($, url);
          break;
        case 'gratka':
          data = this.extractGratkaMetadata($, url);
          break;
        default:
          data = this.extractGenericMetadata($, url);
      }

      return {
        ...data,
        source,
        external_url: url,
        scraped_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Błąd ekstrakcji metadanych:', error.message);
      throw new Error(`Nie udało się wyciągnąć danych z ${url}: ${error.message}`);
    }
  }

  /**
   * Pobiera HTML strony
   */
  async fetchHtml(url) {
    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Dostęp zablokowany (403 Forbidden)');
      }
      if (error.response?.status === 404) {
        throw new Error('Ogłoszenie nie istnieje (404 Not Found)');
      }
      throw error;
    }
  }

  /**
   * Wykrywa źródło na podstawie URL
   */
  detectSource(url) {
    if (url.includes('olx.pl')) return 'olx';
    if (url.includes('otodom.pl')) return 'otodom';
    if (url.includes('gratka.pl')) return 'gratka';
    if (url.includes('morizon.pl')) return 'morizon';
    return 'other';
  }

  /**
   * Ekstrakcja Open Graph z OLX
   */
  extractOLXMetadata($, url) {
    const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim();
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content');
    const price = this.extractPrice($, [
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      '[data-testid="ad-price-container"]',
      '.css-dcwlyx' // OLX price class (może się zmieniać)
    ]);

    // ID ogłoszenia z URL (np. ID-123456.html)
    const externalId = url.match(/ID(\d+)/)?.[1] || url.split('/').pop().split('-').pop().replace('.html', '');

    return {
      external_id: externalId,
      title: this.cleanText(title),
      description: this.cleanText(description),
      price: price,
      images: image ? [{ url: image }] : [],
      location: this.extractLocationFromText(title + ' ' + description),
    };
  }

  /**
   * Ekstrakcja z Otodom
   */
  extractOtodomMetadata($, url) {
    // Otodom używa JSON-LD schema.org
    const jsonLd = this.extractJsonLd($);
    
    if (jsonLd && jsonLd['@type'] === 'Apartment') {
      return {
        external_id: url.split('/').pop().split('-').shift(),
        title: jsonLd.name || $('h1').first().text().trim(),
        description: jsonLd.description,
        price: jsonLd.offers?.price,
        area: this.parseArea(jsonLd.floorSize?.value),
        rooms: this.parseRooms(jsonLd.numberOfRooms),
        images: jsonLd.image ? [{ url: jsonLd.image }] : [],
        location: {
          city: jsonLd.address?.addressLocality,
          latitude: jsonLd.geo?.latitude,
          longitude: jsonLd.geo?.longitude,
        }
      };
    }

    // Fallback do Open Graph
    return {
      external_id: url.split('/').pop().split('-').shift(),
      title: $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim(),
      description: $('meta[property="og:description"]').attr('content'),
      price: this.extractPrice($, ['[data-cy="ad.price"]', '.css-12hdxwj', 'meta[property="og:price:amount"]']),
      images: [{ url: $('meta[property="og:image"]').attr('content') }],
    };
  }

  /**
   * Ekstrakcja z Gratka
   */
  extractGratkaMetadata($, url) {
    return {
      external_id: url.split('/').pop().split('-').pop().replace('.html', ''),
      title: $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim(),
      description: $('meta[property="og:description"]').attr('content'),
      price: this.extractPrice($, ['.priceInfo__value', 'meta[property="og:price:amount"]']),
      images: [{ url: $('meta[property="og:image"]').attr('content') }],
    };
  }

  /**
   * Ekstrakcja generyczna (inne źródła)
   */
  extractGenericMetadata($, url) {
    return {
      external_id: null,
      title: $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim(),
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
      price: this.extractPrice($, ['meta[property="product:price:amount"]', 'meta[property="og:price:amount"]']),
      images: [{ url: $('meta[property="og:image"]').attr('content') }],
    };
  }

  /**
   * Wyciąga JSON-LD schema.org
   */
  extractJsonLd($) {
    const jsonLdScript = $('script[type="application/ld+json"]').first().html();
    if (jsonLdScript) {
      try {
        return JSON.parse(jsonLdScript);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Ekstrakcja ceny z różnych selektorów
   */
  extractPrice($, selectors) {
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        const text = element.attr('content') || element.text();
        const price = this.parsePrice(text);
        if (price) return price;
      }
    }
    return null;
  }

  /**
   * Parsuje cenę z tekstu
   */
  parsePrice(text) {
    if (!text) return null;
    // Usuń wszystko oprócz cyfr
    const cleaned = text.replace(/[^\d]/g, '');
    const price = parseInt(cleaned);
    return price > 0 ? price : null;
  }

  /**
   * Parsuje powierzchnię
   */
  parseArea(text) {
    if (!text) return null;
    const match = String(text).match(/(\d+[.,]?\d*)/);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  /**
   * Parsuje liczbę pokoi
   */
  parseRooms(text) {
    if (!text) return null;
    const match = String(text).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Ekstrakcja lokalizacji z tekstu (heurystyka)
   */
  extractLocationFromText(text) {
    const polishCities = [
      'Warszawa', 'Kraków', 'Łódź', 'Wrocław', 'Poznań',
      'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice'
    ];

    for (const city of polishCities) {
      if (text.includes(city)) {
        return { city };
      }
    }

    return {};
  }

  /**
   * Czyści tekst
   */
  cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Waliduje URL
   */
  isValidPropertyUrl(url) {
    const supportedDomains = ['olx.pl', 'otodom.pl', 'gratka.pl', 'morizon.pl'];
    try {
      const urlObj = new URL(url);
      return supportedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Batch extraction (z rate limiting)
   */
  async extractBatch(urls, delayMs = 2000) {
    const results = [];
    
    for (const url of urls) {
      try {
        const data = await this.extractFromUrl(url);
        results.push({ success: true, url, data });
      } catch (error) {
        results.push({ success: false, url, error: error.message });
      }
      
      // Delay między requestami (szacunek dla serwerów)
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

module.exports = MetadataExtractor;
