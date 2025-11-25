const axios = require('axios');
const cheerio = require('cheerio');
const Property = require('../../models/Property');

class OLXScraper {
  constructor() {
    this.baseUrl = 'https://www.olx.pl';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    };
  }

  /**
   * Pobiera listę ogłoszeń z OLX dla danej kategorii i lokalizacji
   * @param {string} category - np. 'nieruchomosci/mieszkania/sprzedaz'
   * @param {string} city - np. 'warszawa'
   * @param {number} page - numer strony
   * @returns {Promise<Array>} - tablica ogłoszeń
   */
  async scrapeListings(category = 'nieruchomosci/mieszkania/sprzedaz', city = 'warszawa', page = 1) {
    try {
      const url = `${this.baseUrl}/${category}/${city}/?page=${page}`;
      console.log(`🔍 Scraping OLX: ${url}`);

      const response = await axios.get(url, { 
        headers: this.headers,
        timeout: 10000 
      });

      const $ = cheerio.load(response.data);
      const listings = [];

      // OLX używa data-cy="l-card" dla każdego ogłoszenia
      $('[data-cy="l-card"]').each((index, element) => {
        try {
          const $elem = $(element);
          
          // Pobierz ID ogłoszenia z atrybutu data-id
          const externalId = $elem.attr('data-id') || null;
          
          // Link do ogłoszenia
          const link = $elem.find('a').first().attr('href');
          const fullUrl = link?.startsWith('http') ? link : `${this.baseUrl}${link}`;
          
          // Tytuł
          const title = $elem.find('h6').text().trim();
          
          // Cena
          const priceText = $elem.find('p[data-testid="ad-price"]').text().trim();
          const price = this.parsePrice(priceText);
          
          // Lokalizacja
          const locationText = $elem.find('p[data-testid="location-date"]').text().trim();
          const location = locationText.split('-')[0]?.trim() || city;
          
          // Zdjęcie
          const imageUrl = $elem.find('img').first().attr('src') || null;
          
          if (title && fullUrl) {
            listings.push({
              externalId,
              source: 'olx',
              title,
              price,
              location,
              url: fullUrl,
              imageUrl,
              rawData: {
                priceText,
                locationText
              }
            });
          }
        } catch (err) {
          console.error('Błąd parsowania pojedynczego ogłoszenia OLX:', err.message);
        }
      });

      console.log(`✅ Znaleziono ${listings.length} ogłoszeń OLX na stronie ${page}`);
      return listings;

    } catch (error) {
      console.error('Błąd podczas scrapowania OLX:', error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded - OLX zablokował zbyt wiele requestów');
      }
      
      throw error;
    }
  }

  /**
   * Pobiera szczegóły pojedynczego ogłoszenia
   * @param {string} url - URL ogłoszenia
   * @returns {Promise<Object>} - szczegółowe dane ogłoszenia
   */
  async scrapeDetails(url) {
    try {
      console.log(`🔍 Pobieranie szczegółów OLX: ${url}`);
      
      const response = await axios.get(url, { 
        headers: this.headers,
        timeout: 10000 
      });

      const $ = cheerio.load(response.data);
      
      // Szczegółowy opis
      const description = $('[data-cy="ad_description"] div').first().text().trim();
      
      // Parametry nieruchomości
      const parameters = {};
      $('ul[data-cy="ad-parameters-list"] li').each((i, elem) => {
        const label = $(elem).find('span').first().text().trim();
        const value = $(elem).find('p').text().trim();
        if (label && value) {
          parameters[label] = value;
        }
      });

      // Galeria zdjęć
      const images = [];
      $('img[data-testid="photo-image"]').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });

      // Dane sprzedawcy
      const seller = {
        name: $('h4[data-cy="seller-card-name"]').text().trim() || 'Nieznany',
        type: $('.css-1lcz6o7').text().trim() || 'private'
      };

      // Lokalizacja z mapy (jeśli dostępna)
      let latitude = null;
      let longitude = null;
      
      // Szukaj współrzędnych w skrypcie JSON-LD
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);
          if (jsonData.geo) {
            latitude = parseFloat(jsonData.geo.latitude);
            longitude = parseFloat(jsonData.geo.longitude);
          }
        } catch (e) {
          console.warn('Nie można sparsować JSON-LD dla współrzędnych');
        }
      }

      return {
        description,
        parameters,
        images,
        seller,
        location: {
          latitude,
          longitude
        }
      };

    } catch (error) {
      console.error('Błąd podczas pobierania szczegółów OLX:', error.message);
      throw error;
    }
  }

  /**
   * Zapisuje ogłoszenie do bazy danych
   * @param {Object} listingData - dane ogłoszenia
   * @param {Object} detailsData - szczegółowe dane (opcjonalnie)
   * @returns {Promise<Property>}
   */
  async saveToDatabase(listingData, detailsData = null) {
    try {
      // Sprawdź czy ogłoszenie już istnieje
      const existing = await Property.findOne({
        where: {
          source: listingData.source,
          external_id: listingData.externalId
        }
      });

      if (existing) {
        console.log(`⏭️  Ogłoszenie ${listingData.externalId} już istnieje w bazie`);
        return existing;
      }

      // Przygotuj dane do zapisu (zgodne ze schematem schema.sql)
      const propertyData = {
        source: listingData.source,
        external_id: listingData.externalId,
        title: listingData.title,
        description: detailsData?.description || null,
        price: listingData.price,
        currency: 'PLN',
        area: this.extractArea(detailsData?.parameters),
        rooms: this.extractRooms(detailsData?.parameters),
        property_type: this.extractPropertyType(listingData.title, detailsData?.parameters),
        transaction_type: 'sprzedaż',
        address: null, // TODO: wyodrębnić z lokalizacji
        city: listingData.location,
        district: null,
        images: detailsData?.images || (listingData.imageUrl ? [listingData.imageUrl] : []),
        url: listingData.url,
        contact_info: detailsData?.seller ? JSON.stringify(detailsData.seller) : null,
        is_active: true,
        published_at: new Date()
      };

      // Dodaj lokalizację jeśli są współrzędne
      if (detailsData?.location?.latitude && detailsData?.location?.longitude) {
        propertyData.location = {
          type: 'Point',
          coordinates: [detailsData.location.longitude, detailsData.location.latitude]
        };
      }

      const property = await Property.create(propertyData);
      console.log(`✅ Zapisano ogłoszenie ${property.external_id} do bazy`);
      
      return property;

    } catch (error) {
      console.error('Błąd podczas zapisywania do bazy:', error.message);
      throw error;
    }
  }

  // Pomocnicze metody parsowania

  parsePrice(priceText) {
    if (!priceText) return null;
    const cleaned = priceText.replace(/[^\d]/g, '');
    return cleaned ? parseFloat(cleaned) : null;
  }

  extractPropertyType(title, parameters) {
    if (!title && !parameters) return 'unknown';
    
    const text = (title + JSON.stringify(parameters)).toLowerCase();
    
    if (text.includes('dom') || text.includes('house')) return 'house';
    if (text.includes('mieszkanie') || text.includes('apartment')) return 'apartment';
    if (text.includes('działka') || text.includes('land')) return 'land';
    if (text.includes('garaż') || text.includes('garage')) return 'garage';
    
    return 'other';
  }

  extractArea(parameters) {
    if (!parameters) return null;
    
    const areaKey = Object.keys(parameters).find(k => 
      k.toLowerCase().includes('powierzchnia') || k.toLowerCase().includes('area')
    );
    
    if (areaKey) {
      const value = parameters[areaKey];
      const match = value.match(/[\d,.]+/);
      return match ? parseFloat(match[0].replace(',', '.')) : null;
    }
    
    return null;
  }

  extractRooms(parameters) {
    if (!parameters) return null;
    
    const roomsKey = Object.keys(parameters).find(k => 
      k.toLowerCase().includes('liczba pokoi') || k.toLowerCase().includes('rooms')
    );
    
    if (roomsKey) {
      const value = parameters[roomsKey];
      const match = value.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }
    
    return null;
  }

  extractFloor(parameters) {
    if (!parameters) return null;
    
    const floorKey = Object.keys(parameters).find(k => 
      k.toLowerCase().includes('piętro') || k.toLowerCase().includes('floor')
    );
    
    if (floorKey) {
      const value = parameters[floorKey];
      const match = value.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }
    
    return null;
  }

  extractYearBuilt(parameters) {
    if (!parameters) return null;
    
    const yearKey = Object.keys(parameters).find(k => 
      k.toLowerCase().includes('rok budowy') || k.toLowerCase().includes('year')
    );
    
    if (yearKey) {
      const value = parameters[yearKey];
      const match = value.match(/\d{4}/);
      return match ? parseInt(match[0]) : null;
    }
    
    return null;
  }
}

module.exports = OLXScraper;
