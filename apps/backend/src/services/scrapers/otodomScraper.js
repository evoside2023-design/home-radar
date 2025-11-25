const axios = require('axios');
const cheerio = require('cheerio');
const Property = require('../../models/Property');

class OtodomScraper {
  constructor() {
    this.baseUrl = 'https://www.otodom.pl';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    };
  }

  /**
   * Pobiera listę ogłoszeń z Otodom
   * @param {string} transactionType - 'sprzedaz' lub 'wynajem'
   * @param {string} propertyType - 'mieszkanie' lub 'dom'
   * @param {string} city - nazwa miasta
   * @param {number} page - numer strony
   * @returns {Promise<Array>}
   */
  async scrapeListings(transactionType = 'sprzedaz', propertyType = 'mieszkanie', city = 'warszawa', page = 1) {
    try {
      const url = `${this.baseUrl}/pl/wyniki/${transactionType}/${propertyType}/${city}?page=${page}`;
      console.log(`🔍 Scraping Otodom: ${url}`);

      const response = await axios.get(url, { 
        headers: this.headers,
        timeout: 10000 
      });

      const $ = cheerio.load(response.data);
      const listings = [];

      // Otodom używaArticleCard jako komponent ogłoszenia
      $('article[data-cy="listing-item"]').each((index, element) => {
        try {
          const $elem = $(element);
          
          // Link i ID z href
          const link = $elem.find('a').first().attr('href');
          const fullUrl = link?.startsWith('http') ? link : `${this.baseUrl}${link}`;
          
          // ID ogłoszenia z URL (np. /pl/oferta/mieszkanie-warszawa-ID123456)
          const externalId = link?.match(/ID(\d+)/)?.[1] || null;
          
          // Tytuł
          const title = $elem.find('h3').text().trim();
          
          // Cena
          const priceText = $elem.find('[data-cy="listing-item-price"]').text().trim();
          const price = this.parsePrice(priceText);
          
          // Lokalizacja
          const location = $elem.find('[data-cy="listing-item-location"]').text().trim() || city;
          
          // Powierzchnia i pokoje
          const detailsText = $elem.find('[data-cy="listing-item-details"]').text();
          const area = this.extractAreaFromText(detailsText);
          const rooms = this.extractRoomsFromText(detailsText);
          
          // Zdjęcie
          const imageUrl = $elem.find('img').first().attr('src') || null;
          
          if (title && fullUrl) {
            listings.push({
              externalId,
              source: 'otodom',
              title,
              price,
              location,
              area,
              rooms,
              url: fullUrl,
              imageUrl,
              propertyType,
              transactionType,
              rawData: {
                priceText,
                detailsText
              }
            });
          }
        } catch (err) {
          console.error('Błąd parsowania pojedynczego ogłoszenia Otodom:', err.message);
        }
      });

      console.log(`✅ Znaleziono ${listings.length} ogłoszeń Otodom na stronie ${page}`);
      return listings;

    } catch (error) {
      console.error('Błąd podczas scrapowania Otodom:', error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded - Otodom zablokował zbyt wiele requestów');
      }
      
      throw error;
    }
  }

  /**
   * Pobiera szczegóły pojedynczego ogłoszenia
   * @param {string} url - URL ogłoszenia
   * @returns {Promise<Object>}
   */
  async scrapeDetails(url) {
    try {
      console.log(`🔍 Pobieranie szczegółów Otodom: ${url}`);
      
      const response = await axios.get(url, { 
        headers: this.headers,
        timeout: 10000 
      });

      const $ = cheerio.load(response.data);
      
      // Opis
      const description = $('[data-cy="adPageAdDescription"]').text().trim();
      
      // Parametry
      const parameters = {};
      $('[data-cy="ad.top-information.table"] div[role="region"]').each((i, elem) => {
        const label = $(elem).find('div').first().text().trim();
        const value = $(elem).find('div').last().text().trim();
        if (label && value && label !== value) {
          parameters[label] = value;
        }
      });

      // Galeria zdjęć
      const images = [];
      $('[data-cy="gallery"] img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });

      // Współrzędne geograficzne
      let latitude = null;
      let longitude = null;
      
      // Szukaj danych JSON w window.__NEXT_DATA__
      const nextDataScript = $('script#__NEXT_DATA__').html();
      if (nextDataScript) {
        try {
          const jsonData = JSON.parse(nextDataScript);
          const adData = jsonData?.props?.pageProps?.ad;
          
          if (adData?.location) {
            latitude = adData.location.coordinates?.latitude;
            longitude = adData.location.coordinates?.longitude;
          }
          
          // Dodatkowe parametry z JSON
          if (adData?.characteristics) {
            adData.characteristics.forEach(char => {
              if (char.key && char.localizedValue) {
                parameters[char.key] = char.localizedValue;
              }
            });
          }
        } catch (e) {
          console.warn('Nie można sparsować __NEXT_DATA__ dla współrzędnych');
        }
      }

      return {
        description,
        parameters,
        images,
        location: {
          latitude,
          longitude
        }
      };

    } catch (error) {
      console.error('Błąd podczas pobierania szczegółów Otodom:', error.message);
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
        area: listingData.area || this.extractArea(detailsData?.parameters),
        rooms: listingData.rooms || this.extractRooms(detailsData?.parameters),
        property_type: this.mapPropertyType(listingData.propertyType),
        transaction_type: listingData.transactionType === 'wynajem' ? 'wynajem' : 'sprzedaż',
        address: null,
        city: this.extractCity(listingData.location),
        district: null,
        images: detailsData?.images || (listingData.imageUrl ? [listingData.imageUrl] : []),
        url: listingData.url,
        contact_info: null,
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

  extractAreaFromText(text) {
    if (!text) return null;
    const match = text.match(/([\d,.]+)\s*m²/);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  extractRoomsFromText(text) {
    if (!text) return null;
    const match = text.match(/(\d+)\s*(pokój|pokoje|pokoi)/i);
    return match ? parseInt(match[1]) : null;
  }

  extractCity(location) {
    if (!location) return null;
    // Zakładamy format "Warszawa, Mokotów, ul. Przykładowa"
    const parts = location.split(',');
    return parts[0]?.trim() || null;
  }

  extractStreet(location) {
    if (!location) return null;
    const parts = location.split(',');
    return parts.length > 2 ? parts[2]?.trim() : null;
  }

  mapPropertyType(type) {
    const mapping = {
      'mieszkanie': 'apartment',
      'dom': 'house',
      'dzialka': 'land',
      'lokal': 'commercial'
    };
    return mapping[type] || 'other';
  }

  extractArea(parameters) {
    if (!parameters) return null;
    
    const areaKey = Object.keys(parameters).find(k => 
      k.toLowerCase().includes('powierzchnia') || k === 'Powierzchnia' || k === 'Area'
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
      k.toLowerCase().includes('liczba pokoi') || k === 'Liczba pokoi'
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
      k.toLowerCase().includes('piętro') || k === 'Piętro'
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
      k.toLowerCase().includes('rok budowy') || k === 'Rok budowy'
    );
    
    if (yearKey) {
      const value = parameters[yearKey];
      const match = value.match(/\d{4}/);
      return match ? parseInt(match[0]) : null;
    }
    
    return null;
  }
}

module.exports = OtodomScraper;
