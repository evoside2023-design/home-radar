# Moduł Integracji OLX/Otodom - Dokumentacja

## ✅ Zakończone (Zadanie #4)

### Zaimplementowane komponenty:

#### 1. **OLXScraper** (`src/services/scrapers/olxScraper.js`)
- Scraping listy ogłoszeń z OLX.pl
- Pobieranie szczegółowych danych pojedynczych ogłoszeń
- Parsowanie HTML z biblioteką Cheerio
- Ekstrakcja parametrów: cena, lokalizacja, powierzchnia, liczba pokoi
- Zapisywanie do bazy danych z deduplikacją

#### 2. **OtodomScraper** (`src/services/scrapers/otodomScraper.js`)
- Scraping listy ogłoszeń z Otodom.pl
- Pobieranie szczegółów z JSON-LD i __NEXT_DATA__
- Parsowanie parametrów nieruchomości
- Ekstrakcja współrzędnych geograficznych
- Zapisywanie z obsługą JSONB i PostGIS

#### 3. **ScraperService** (`src/services/scraperService.js`)
- Orkiestracja scrapowania z wielu źródeł
- Zarządzanie rate limitami (delay między requestami)
- Cron job dla automatyzacji (node-cron)
- Konfiguracja miast, liczby stron, źródeł
- Szczegółowe raportowanie wyników

#### 4. **Property Model** (`src/models/Property.js`)
- Model Sequelize zgodny ze schematem PostgreSQL
- Wsparcie dla PostGIS GEOGRAPHY(POINT)
- Pola: external_id, source, title, price, area, rooms, images (JSONB), location
- Indeksy na city, price, property_type, is_active

#### 5. **API Endpoints** (`src/routes/scraper.js`)
```
POST   /api/scraper/run          - Ręczne uruchomienie scrapingu
GET    /api/scraper/status       - Status scrapera
POST   /api/scraper/cron/start   - Włącz automatyczny scraping
POST   /api/scraper/cron/stop    - Wyłącz cron job
POST   /api/scraper/config       - Aktualizacja konfiguracji
```

#### 6. **Instalowane zależności:**
- `axios` - HTTP requests
- `cheerio` - Parsowanie HTML (jQuery-like syntax)
- `node-cron` - Harmonogramowanie zadań

---

## 🚨 Ograniczenia i Uwagi Produkcyjne

### Problem: Wykrywanie botów (Status 403)
OLX i Otodom aktywnie blokują web scraping:
- Cloudflare bot protection
- Rate limiting
- Fingerprinting przeglądarki
- CAPTCHA

### Rozwiązania produkcyjne:

#### Opcja A: **Użycie Proxy i Rotation**
```javascript
// Przykład z rotating proxies
const proxyList = ['proxy1.com:8080', 'proxy2.com:8080'];
axios.get(url, {
  proxy: getRandomProxy(),
  headers: randomizeUserAgent()
});
```

#### Opcja B: **Headless Browser (Puppeteer/Playwright)**
```bash
npm install puppeteer
```
```javascript
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url);
const html = await page.content();
```

#### Opcja C: **Płatne API Scrapingowe** (Recommended for MVP)
- **ScrapingBee** - https://www.scrapingbee.com/
  - 1000 free requests/month
  - Obsługa JavaScript rendering
  - Proxy rotation built-in
  
- **Apify** - https://apify.com/ecomscrape/olx-product-search-scraper
  - Gotowe scrapersy OLX/Otodom
  - $5/month starter plan
  
- **Actowiz Solutions** - Profesjonalne data scraping as a service

```javascript
// Przykład ScrapingBee
const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
  params: {
    api_key: process.env.SCRAPINGBEE_API_KEY,
    url: 'https://www.olx.pl/...',
    render_js: true
  }
});
```

#### Opcja D: **Oficjalne Partnerstwa**
- Otodom Analytics API (płatne, dla profesjonalistów)
- Bezpośredni contact z OLX/Otodom w celu uzyskania API access

---

## 🔧 Konfiguracja dla testów lokalnych

### Użycie mock data (zalecane dla development):
```javascript
// src/services/scrapers/mockScraper.js
const mockListings = [
  {
    externalId: 'mock-001',
    source: 'olx',
    title: 'Mieszkanie 3-pokojowe, 65m², Mokotów',
    price: 850000,
    location: 'Warszawa, Mokotów',
    // ...
  }
];
```

### Delay i respectful scraping:
```javascript
scraperService.updateConfig({
  delayBetweenRequests: 5000, // 5 sekund między requestami
  maxPagesPerCity: 2,          // Limit stron
  fullDetailsEnabled: false    // Tylko podstawowe dane
});
```

---

## 📊 Testowanie

### 1. Test manualny:
```bash
cd apps/backend
node src/test-scraper.js
```

### 2. Test przez API (wymaga autoryzacji):
```bash
# Zaloguj się i pobierz token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan.kowalski@domradar.pl","password":"haslo123"}'

# Uruchom scraping
curl -X POST http://localhost:5000/api/scraper/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cities":["warszawa"],"maxPages":1,"sources":["olx"]}'
```

### 3. Cron job (automatyczny scraping):
```bash
# Uruchom codziennie o 2:00 AM
curl -X POST http://localhost:5000/api/scraper/cron/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schedule":"0 2 * * *"}'
```

---

## 🎯 Następne kroki

### Zadanie #5: API do zarządzania nieruchomościami
- Implementacja CRUD endpoints dla `/api/properties`
- Filtry: cena, powierzchnia, lokalizacja, typ
- Paginacja i sortowanie
- Wyszukiwanie geograficzne (PostGIS)

### Przyszłe ulepszenia scrapera:
1. Integracja z Puppeteer dla JavaScript rendering
2. Proxy rotation dla uniknięcia bloków
3. Error recovery i retry logic
4. Monitoring i alerty (np. Sentry)
5. Cache wyników w Redis
6. Webhook notifications po zakończeniu scrapingu

---

## 📝 Struktura plików

```
apps/backend/src/
├── services/
│   ├── scraperService.js          # Główny orkiestrator
│   └── scrapers/
│       ├── olxScraper.js          # OLX scraper
│       └── otodomScraper.js       # Otodom scraper
├── models/
│   └── Property.js                # Model nieruchomości
├── controllers/
│   └── scraperController.js      # API controllers
├── routes/
│   └── scraper.js                 # API routes
└── test-scraper.js                # Test script
```

---

## 🔐 Bezpieczeństwo

### Rate Limiting:
- Express rate limiter już skonfigurowany (100 req/15min)
- Scraper ma built-in delay między requestami
- TODO: Dodać IP rotation dla produkcji

### Autoryzacja:
- Wszystkie endpointy wymagają JWT token
- TODO: Dodać role 'admin' dla dostępu do scraper endpoints

### Legal Compliance:
⚠️ **WAŻNE**: Web scraping może naruszać Terms of Service OLX/Otodom
- Zalecane: Skontaktowanie się z właścicielami platform
- Alternatywa: Użycie oficjalnych API lub partnerstw
- Dla MVP: Rozważyć manual data entry lub mock data

---

## 📊 Metryki sukcesu

- ✅ Infrastruktura gotowa (3 scrapersy, API, cron)
- ✅ Model bazy danych z PostGIS
- ✅ Error handling i logging
- ⚠️ Blokada przez 403 - wymaga proxy/API solution
- 📋 TODO: Integracja z płatnym API lub Puppeteer

---

**Status:** Zadanie #4 zakończone (infrastruktura gotowa, wymaga produkcyjnego rozwiązania anti-bot)
