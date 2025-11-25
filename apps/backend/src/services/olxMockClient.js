/**
 * Mock OLX API Client - do testowania bez prawdziwych credentials
 * Używany gdy OLX_USE_MOCK=true w .env
 */
class OLXMockClient {
  constructor() {
    console.log('⚠️  Using OLX Mock Client (set OLX_USE_MOCK=false to use real API)');
  }

  async authenticate() {
    console.log('🔐 Mock: Authentication successful');
    return true;
  }

  async getProperties(filters = {}) {
    console.log('🔍 Mock: Fetching properties with filters:', filters);
    
    // Symuluj delay API
    await this.delay(500);

    const mockProperties = this.generateMockProperties(filters.limit || 10, filters.city);
    
    console.log(`✅ Mock: Returned ${mockProperties.length} properties`);
    return mockProperties;
  }

  async getPropertyDetails(propertyId) {
    console.log(`🔍 Mock: Fetching details for property ${propertyId}`);
    
    await this.delay(300);

    return {
      externalId: propertyId,
      source: 'olx',
      title: 'Mieszkanie 3-pokojowe, Centrum, 65m²',
      description: `Oferuję do sprzedaży przestronne mieszkanie 3-pokojowe o powierzchni 65m² położone w centrum miasta.
      
Mieszkanie składa się z:
- przestronnego salonu z aneksem kuchennym (25m²)
- dwóch sypialni (12m² i 10m²)
- łazienki z wanną (6m²)
- przedpokoju (8m²)
- balkonu (4m²)

Mieszkanie jest w bardzo dobrym stanie, po remoncie z 2020 roku. Okna PCV, ogrzewanie miejskie, antresola.
Niski blok 4-piętrowy z windą. W pobliżu szkoła, przedszkola, sklepy, przychodnia, komunikacja miejska.

Cena: 850,000 PLN (możliwa negocjacja)
Kontakt: 123-456-789`,
      price: 850000,
      currency: 'PLN',
      area: 65,
      rooms: 3,
      propertyType: 'apartment',
      transactionType: 'sale',
      address: 'ul. Przykładowa 123',
      city: 'Warszawa',
      district: 'Śródmieście',
      location: {
        type: 'Point',
        coordinates: [21.0122, 52.2297] // Warszawa centrum
      },
      images: [
        'https://picsum.photos/800/600?random=1',
        'https://picsum.photos/800/600?random=2',
        'https://picsum.photos/800/600?random=3',
        'https://picsum.photos/800/600?random=4',
        'https://picsum.photos/800/600?random=5'
      ],
      url: 'https://www.olx.pl/d/oferta/mock-' + propertyId,
      contactInfo: {
        name: 'Jan Kowalski',
        phone: '+48123456789',
        type: 'private'
      },
      isActive: true,
      publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async getCategories() {
    return [
      { id: 1, name: 'Nieruchomości', slug: 'nieruchomosci' },
      { id: 2, name: 'Mieszkania', slug: 'mieszkania', parent_id: 1 },
      { id: 3, name: 'Domy', slug: 'domy', parent_id: 1 },
      { id: 4, name: 'Działki', slug: 'dzialki', parent_id: 1 }
    ];
  }

  async getLocations(query) {
    const cities = [
      { id: 1, name: 'Warszawa', slug: 'warszawa', region: 'mazowieckie' },
      { id: 2, name: 'Kraków', slug: 'krakow', region: 'małopolskie' },
      { id: 3, name: 'Wrocław', slug: 'wroclaw', region: 'dolnośląskie' },
      { id: 4, name: 'Poznań', slug: 'poznan', region: 'wielkopolskie' },
      { id: 5, name: 'Gdańsk', slug: 'gdansk', region: 'pomorskie' }
    ];

    if (query) {
      return cities.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    return cities;
  }

  async getApiUsage() {
    return {
      requests_today: 42,
      requests_limit: 1000,
      requests_remaining: 958,
      reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // Generowanie mock danych

  generateMockProperties(count, city = 'Warszawa') {
    const properties = [];
    const types = ['apartment', 'house', 'land'];
    const districts = ['Mokotów', 'Śródmieście', 'Praga', 'Ochota', 'Żoliborz', 'Wola'];
    
    for (let i = 1; i <= count; i++) {
      const rooms = Math.floor(Math.random() * 5) + 1;
      const area = Math.floor(Math.random() * 80) + 30;
      const pricePerM2 = Math.floor(Math.random() * 8000) + 8000;
      const price = area * pricePerM2;
      const type = types[Math.floor(Math.random() * types.length)];

      properties.push({
        externalId: `mock-${i}-${Date.now()}`,
        source: 'olx',
        title: this.generateTitle(type, rooms, area, districts[i % districts.length]),
        description: null, // Pełny opis tylko w getPropertyDetails
        price: price,
        currency: 'PLN',
        area: area,
        rooms: type === 'land' ? null : rooms,
        propertyType: type,
        transactionType: Math.random() > 0.7 ? 'rent' : 'sale',
        address: null,
        city: city,
        district: districts[i % districts.length],
        location: {
          type: 'Point',
          coordinates: [
            21.0122 + (Math.random() - 0.5) * 0.1, // Warszawa +/- 5km
            52.2297 + (Math.random() - 0.5) * 0.1
          ]
        },
        images: [
          `https://picsum.photos/800/600?random=${i}1`,
          `https://picsum.photos/800/600?random=${i}2`
        ],
        url: `https://www.olx.pl/d/oferta/mock-${i}`,
        contactInfo: null,
        isActive: true,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return properties;
  }

  generateTitle(type, rooms, area, district) {
    const typeNames = {
      apartment: 'Mieszkanie',
      house: 'Dom',
      land: 'Działka'
    };

    const typeName = typeNames[type] || 'Nieruchomość';
    
    if (type === 'land') {
      return `${typeName} ${area}m², ${district}`;
    }

    return `${typeName} ${rooms}-pokojowe, ${area}m², ${district}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OLXMockClient;
