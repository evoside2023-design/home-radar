const axios = require('axios');

/**
 * OLX Official Partner API Client
 * Dokumentacja: https://developer.olx.pl/docs
 * Wymaga rejestracji aplikacji i uzyskania Client ID/Secret
 */
class OLXApiClient {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.OLX_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.OLX_CLIENT_SECRET;
    this.baseUrl = config.baseUrl || process.env.OLX_API_BASE_URL || 'https://api.olx.pl/v1';
    this.oauthUrl = config.oauthUrl || process.env.OLX_OAUTH_URL || 'https://oauth.olx.pl/oauth/token';
    
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // Axios instance z default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Interceptor dla automatycznego dodawania tokenu
    this.client.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });

    // Interceptor dla obsługi błędów
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          // Token wygasł - odśwież i ponów request
          this.accessToken = null;
          await this.ensureValidToken();
          error.config.headers.Authorization = `Bearer ${this.accessToken}`;
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Sprawdza czy token jest ważny, jeśli nie - pobiera nowy
   */
  async ensureValidToken() {
    const now = Date.now();
    
    // Sprawdź czy token istnieje i jest ważny (z 5 min buforem)
    if (this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt - 300000) {
      return;
    }

    await this.authenticate();
  }

  /**
   * OAuth 2.0 Client Credentials Flow
   * Dokumentacja: https://developer.olx.pl/docs/authentication
   */
  async authenticate() {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('OLX API credentials not configured. Set OLX_CLIENT_ID and OLX_CLIENT_SECRET in .env');
      }

      console.log('🔐 Authenticating with OLX Partner API...');

      const response = await axios.post(this.oauthUrl, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'read:properties write:properties'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600; // domyślnie 1h
      this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

      console.log(`✅ OLX API authentication successful. Token expires in ${expiresIn}s`);

    } catch (error) {
      console.error('❌ OLX API authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with OLX API');
    }
  }

  /**
   * Pobiera listę ogłoszeń nieruchomości
   * @param {Object} filters - Filtry wyszukiwania
   * @returns {Promise<Array>}
   */
  async getProperties(filters = {}) {
    try {
      const params = {
        category: filters.category || 'nieruchomosci',
        city: filters.city,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        sort: filters.sort || 'created_at:desc'
      };

      // Filtry cenowe
      if (filters.priceMin) params.price_from = filters.priceMin;
      if (filters.priceMax) params.price_to = filters.priceMax;

      // Filtry powierzchni
      if (filters.areaMin) params.area_from = filters.areaMin;
      if (filters.areaMax) params.area_to = filters.areaMax;

      // Liczba pokoi
      if (filters.rooms) params.rooms = filters.rooms;

      // Typ transakcji
      if (filters.transactionType) params.transaction_type = filters.transactionType;

      console.log(`🔍 Fetching properties from OLX API:`, params);

      const response = await this.client.get('/properties', { params });

      const properties = response.data.data || response.data.items || [];
      
      console.log(`✅ Fetched ${properties.length} properties from OLX API`);

      return properties.map(prop => this.normalizeProperty(prop));

    } catch (error) {
      console.error('❌ Error fetching properties from OLX API:', error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        throw new Error('OLX API rate limit exceeded. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Pobiera szczegóły pojedynczego ogłoszenia
   * @param {string} propertyId - ID ogłoszenia
   * @returns {Promise<Object>}
   */
  async getPropertyDetails(propertyId) {
    try {
      console.log(`🔍 Fetching property details for ID: ${propertyId}`);

      const response = await this.client.get(`/properties/${propertyId}`);
      const property = response.data.data || response.data;

      return this.normalizeProperty(property, true);

    } catch (error) {
      console.error(`❌ Error fetching property ${propertyId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Pobiera dostępne kategorie
   * @returns {Promise<Array>}
   */
  async getCategories() {
    try {
      const response = await this.client.get('/categories');
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching categories:', error.message);
      throw error;
    }
  }

  /**
   * Pobiera dostępne lokalizacje
   * @param {string} query - Wyszukiwane miasto/region
   * @returns {Promise<Array>}
   */
  async getLocations(query) {
    try {
      const response = await this.client.get('/locations', {
        params: { q: query }
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching locations:', error.message);
      throw error;
    }
  }

  /**
   * Normalizuje dane z OLX API do formatu DomRadar
   * @param {Object} property - Surowe dane z API
   * @param {boolean} detailed - Czy to szczegółowe dane
   * @returns {Object}
   */
  normalizeProperty(property, detailed = false) {
    return {
      externalId: property.id?.toString(),
      source: 'olx',
      title: property.title,
      description: detailed ? property.description : null,
      price: this.extractPrice(property.price),
      currency: property.price?.currency || 'PLN',
      area: this.extractArea(property.params || property.attributes),
      rooms: this.extractRooms(property.params || property.attributes),
      propertyType: this.extractPropertyType(property.category?.name || property.category),
      transactionType: this.extractTransactionType(property.category?.name || property.category),
      address: property.location?.address || null,
      city: property.location?.city?.name || property.location?.city,
      district: property.location?.district?.name || property.location?.district,
      location: property.location?.coordinates ? {
        type: 'Point',
        coordinates: [
          property.location.coordinates.longitude,
          property.location.coordinates.latitude
        ]
      } : null,
      images: property.photos?.map(p => p.link || p.url) || [],
      url: property.url,
      contactInfo: detailed ? {
        name: property.user?.name,
        phone: property.phone,
        type: property.user?.type // private/business
      } : null,
      isActive: property.status === 'active',
      publishedAt: property.created_at || property.created_time,
      rawData: property // Zachowaj oryginalne dane dla debugowania
    };
  }

  // Pomocnicze metody ekstrakcji danych

  extractPrice(priceData) {
    if (!priceData) return null;
    return parseFloat(priceData.value || priceData.amount || priceData);
  }

  extractArea(params) {
    if (!params || !Array.isArray(params)) return null;
    const areaParam = params.find(p => p.key === 'area' || p.key === 'powierzchnia');
    return areaParam ? parseFloat(areaParam.value) : null;
  }

  extractRooms(params) {
    if (!params || !Array.isArray(params)) return null;
    const roomsParam = params.find(p => p.key === 'rooms' || p.key === 'liczba_pokoi');
    return roomsParam ? parseInt(roomsParam.value) : null;
  }

  extractPropertyType(category) {
    if (!category) return 'other';
    const cat = category.toLowerCase();
    
    if (cat.includes('mieszkan')) return 'apartment';
    if (cat.includes('dom')) return 'house';
    if (cat.includes('działk')) return 'land';
    if (cat.includes('garaż')) return 'garage';
    if (cat.includes('lokal')) return 'commercial';
    
    return 'other';
  }

  extractTransactionType(category) {
    if (!category) return 'sale';
    const cat = category.toLowerCase();
    return cat.includes('wynajem') || cat.includes('rent') ? 'rent' : 'sale';
  }

  /**
   * Pobiera statystyki użycia API (jeśli dostępne)
   * @returns {Promise<Object>}
   */
  async getApiUsage() {
    try {
      const response = await this.client.get('/usage');
      return response.data;
    } catch (error) {
      console.warn('⚠️  API usage endpoint not available');
      return null;
    }
  }
}

module.exports = OLXApiClient;
