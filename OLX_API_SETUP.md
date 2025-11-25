# OLX Partner API - Instrukcja Integracji

## 🎯 Rejestracja w OLX Partner Portal

### Krok 1: Dostęp do portalu
Odwiedź: **https://developer.olx.pl** (Portal Deweloperski OLX)

### Krok 2: Utwórz aplikację
Wypełnij formularz z następującymi informacjami:

| Pole | Wartość dla DomRadar |
|------|---------------------|
| **Nazwa aplikacji** | DomRadar - Agregator Nieruchomości |
| **Adres strony WWW firmy** | https://domradar.pl (lub localhost:3000 dla dev) |
| **URI wywołania zwrotnego** | https://domradar.pl/api/auth/olx/callback |
| **Application description** | Platforma agregująca ogłoszenia nieruchomości z OLX i Otodom. Oferujemy użytkownikom interaktywną mapę, alerty cenowe, analizę otoczenia i statystyki rynku. |

### Krok 3: Poczekaj na zatwierdzenie
- Aplikacja będzie w statusie "oczekuje na zatwierdzenie"
- OLX sprawdzi Twoją aplikację (zwykle 1-3 dni robocze)
- Po zatwierdzeniu otrzymasz:
  - **Client ID**
  - **Client Secret**
  - Dostęp do dokumentacji API

---

## 🔐 Wymagania techniczne

### TLS/SSL
OLX wymaga protokołów zgodnych z **TLSv1.2_2021**:
- TLS 1.2 lub nowszy
- Szyfrowanie zgodne ze standardem AWS TLS 2021
- Node.js 14+ automatycznie wspiera te wymagania

### Weryfikacja w Node.js:
```javascript
// Sprawdź wersję TLS
const https = require('https');
console.log(https.globalAgent.options.secureProtocol); // Powinno być TLSv1_2 lub wyżej
```

---

## 📚 Dokumentacja OLX API

Po zatwierdzeniu aplikacji, dostęp do:
- **API Reference**: Endpointy, parametry, response schemas
- **Authentication**: OAuth 2.0 flow
- **Rate Limits**: Limity requestów (typowo 100-1000 req/min)
- **Webhooks**: Real-time notifications o nowych ogłoszeniach

### Główne endpointy (przewidywane):
```
GET  /api/v1/properties          - Lista ogłoszeń
GET  /api/v1/properties/{id}     - Szczegóły ogłoszenia
GET  /api/v1/categories          - Kategorie
GET  /api/v1/locations           - Lokalizacje
POST /api/v1/properties          - Dodaj ogłoszenie (dla partnerów)
```

---

## 🔧 Implementacja w DomRadar

### 1. Konfiguracja zmiennych środowiskowych

Dodaj do `.env`:
```env
# OLX Partner API
OLX_CLIENT_ID=your_client_id_here
OLX_CLIENT_SECRET=your_client_secret_here
OLX_API_BASE_URL=https://api.olx.pl/v1
OLX_OAUTH_URL=https://oauth.olx.pl/oauth/token
OLX_REDIRECT_URI=http://localhost:5000/api/auth/olx/callback
```

### 2. Zainstaluj dependencies
```bash
npm install oauth2-client-node
# lub użyj axios z custom OAuth2 flow
```

### 3. Użyj zaimplementowanego klienta
```javascript
const OLXApiClient = require('./services/olxApiClient');

const client = new OLXApiClient({
  clientId: process.env.OLX_CLIENT_ID,
  clientSecret: process.env.OLX_CLIENT_SECRET
});

// Pobierz ogłoszenia
const properties = await client.getProperties({
  category: 'nieruchomosci',
  city: 'warszawa',
  limit: 50
});
```

---

## 🚀 Zalety oficjalnego API vs Web Scraping

| Aspekt | Official API ✅ | Web Scraping ❌ |
|--------|----------------|----------------|
| **Legalność** | Zgodne z ToS | Naruszenie ToS |
| **Stabilność** | Gwarantowane schema | Zmienia się z UI |
| **Rate limits** | Jasno określone | Blokady IP/403 |
| **Performance** | Szybkie, JSON | Wolne, HTML parsing |
| **Wsparcie** | Dokumentacja + support | Brak |
| **Koszty** | Może być płatne (po limicie) | "Darmowe" ale ryzykowne |
| **Maintenance** | Niski | Wysoki (zmiane UI) |

---

## 📊 Migracja z Web Scraping na Official API

### Plik: `src/services/olxApiClient.js`
Nowy klient został już utworzony z:
- OAuth 2.0 authentication
- Automatic token refresh
- Rate limiting handling
- Error retry logic
- TypeScript-like JSDoc annotations

### Aktualizacja ScraperService:
```javascript
// Zamiast:
const listings = await olxScraper.scrapeListings(...);

// Użyj:
const listings = await olxApiClient.getProperties(...);
```

---

## 🧪 Testowanie (bez zatwierdzonej aplikacji)

### Tryb Mock Data:
1. Użyj `src/services/olxMockClient.js` z przykładowymi danymi
2. W `.env` ustaw: `OLX_USE_MOCK=true`
3. Testuj logikę bez prawdziwych API calls

```javascript
if (process.env.OLX_USE_MOCK === 'true') {
  const mockData = require('./olxMockData.json');
  return mockData.properties;
}
```

---

## 📞 Kontakt z OLX API Support

Po zatwierdzeniu aplikacji:
- **Email support**: developers@olx.pl
- **Discord/Slack**: Możliwy kanał dla partnerów
- **Status page**: Monitoring dostępności API

---

## ✅ Checklist implementacji

- [x] Utworzenie struktury OLX API client
- [x] Konfiguracja OAuth 2.0 flow
- [ ] **Rejestracja aplikacji w OLX Partner Portal** ⬅️ TO DO
- [ ] Dodanie Client ID i Secret do `.env`
- [ ] Testowanie authentication flow
- [ ] Implementacja wszystkich endpoints
- [ ] Migracja z web scraping na API
- [ ] Testy integracyjne
- [ ] Dokumentacja dla zespołu

---

## 🔜 Następne kroki

1. **Zarejestruj aplikację** na https://developer.olx.pl
2. **Poczekaj na zatwierdzenie** (1-3 dni)
3. **Dodaj credentials** do `.env`
4. **Uruchom testy**: `npm run test:olx-api`
5. **Przełącz na produkcję**: Usuń mock mode

---

**Status:** Infrastruktura gotowa, oczekuje na OLX Partner credentials 🎉
