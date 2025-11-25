# OLX API - Kluczowe odkrycia i zmiana strategii

## ❌ Co OLX Partner API NIE ROBI

Po dogłębnej analizie dokumentacji `olx_api.yaml` odkryto krytyczny fakt:

**OLX Partner API służy wyłącznie do PUBLIKOWANIA własnych ogłoszeń, NIE do pobierania/czytania ogłoszeń innych użytkowników.**

### Dostępne endpointy OLX Partner API:
```
POST   /api/partner/adverts          - Dodaj nowe ogłoszenie
GET    /api/partner/adverts          - Pobierz WŁASNE ogłoszenia
PUT    /api/partner/adverts/{id}     - Edytuj WŁASNE ogłoszenie
DELETE /api/partner/adverts/{id}     - Usuń WŁASNE ogłoszenie
GET    /api/partner/categories       - Pobierz kategorie
GET    /api/partner/cities           - Pobierz miasta
```

### Grant types:
- `client_credentials` - kontekst aplikacji (tylko dane konfiguracyjne)
- `authorization_code` - kontekst użytkownika (zarządzanie WŁASNYMI ogłoszeniami)
- `refresh_token` - odświeżanie tokenów

### Czego BRAK:
- ❌ Endpoint do wyszukiwania ogłoszeń
- ❌ Endpoint do czytania ogłoszeń innych użytkowników
- ❌ Public read-only API
- ❌ Search/filter API

## ✅ Nowa strategia: User Generated Content + Metadata Extraction

### Implementacja:

#### 1. Property Submission Service (`propertySubmissionService.js`)
- Użytkownicy wklejają linki do ogłoszeń (OLX/Otodom/Gratka)
- System wyciąga metadane (Open Graph, JSON-LD, Schema.org)
- Zapisuje do bazy jako "external properties"
- Gamification - punkty za dodawanie linków

#### 2. Metadata Extractor (`metadataExtractor.js`)
- Legalna ekstrakcja publicznych meta tagów
- Wspiera: OLX, Otodom, Gratka, Morizon
- Open Graph protocol
- Schema.org JSON-LD
- Heurystyki dla missing data

#### 3. Properties API (`routes/properties.js`)
```
POST   /api/properties/submit          - Submit link (guest or user)
POST   /api/properties/submit-batch    - Batch submission (authenticated)
GET    /api/properties                 - List all properties (z filtrowaniem)
GET    /api/properties/:id             - Property details
GET    /api/properties/submission-stats - User statistics
```

### Przykładowe użycie:

```bash
# User wkleja link OLX
curl -X POST http://localhost:5000/api/properties/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.olx.pl/d/oferta/mieszkanie-warszawa-ID123456.html"
  }'

# Response:
{
  "success": true,
  "status": "created",
  "message": "Ogłoszenie dodane pomyślnie",
  "property": {
    "id": 15,
    "title": "Mieszkanie 3-pokojowe, 65m², Warszawa Mokotów",
    "price": 650000,
    "area": 65,
    "rooms": 3,
    "source": "olx",
    "external_url": "https://www.olx.pl/..."
  }
}
```

## 📊 Przewagi tego podejścia:

### Zalety:
✅ **Legalne** - wyciągamy tylko publiczne metadane
✅ **Szybki start** - MVP gotowy w kilka dni
✅ **Community-driven** - użytkownicy budują bazę
✅ **Gamification** - punkty, rankingi, badges
✅ **Skalowalne** - później dodamy API providers
✅ **Bezpieczne** - nie łamiemy ToS OLX/Otodom

### Roadmap:
1. **Faza 1 (teraz):** User submissions + metadata extraction
2. **Faza 2 (2 tyg):** Kontakt z Gratka/Morizon API
3. **Faza 3 (1-2 mies):** Negocjacje z OLX/Otodom B2B
4. **Faza 4 (przyszłość):** OLX Publisher - users can post ads

## 🎯 OLX Partner API - przyszłe użycie

Zachowujemy kod `olxApiClient.js` na przyszłość:

### Feature: "Opublikuj na OLX"
```javascript
// User tworzy ogłoszenie w DomRadar
// Klik "Opublikuj na OLX"
// DomRadar używa OLX Partner API do automatycznej publikacji

const olxClient = new OLXApiClient();
await olxClient.createAdvert({
  title: "Mieszkanie 3-pokoje Warszawa",
  description: "...",
  category_id: 1234,
  price: { value: 650000, currency: "PLN" },
  // ...
});
```

### User flow:
1. User łączy konto DomRadar z OLX (OAuth)
2. Tworzy ogłoszenie w DomRadar
3. Klik "Opublikuj również na OLX"
4. Automatyczna publikacja przez Partner API
5. Zarządzanie ogłoszeniem z DomRadar (refresh, deactivate, etc.)

## 🔧 Zmiany w architekturze:

### Usunięte/Zmienione:
- ❌ `scraperService.js` - nie potrzebny (web scraping)
- ❌ `olxMockClient.js` - nie potrzebny (mock data)
- ✏️ `olxApiClient.js` → zachowany na przyszłość (publisher)

### Dodane:
- ✅ `metadataExtractor.js` - Open Graph extraction
- ✅ `propertySubmissionService.js` - user submissions
- ✅ `routes/properties.js` - properties CRUD API
- ✅ `test-submission.js` - test script

## 📝 Update modelu Property

Model już wspiera external properties:
```javascript
{
  source: 'olx' | 'otodom' | 'gratka' | 'morizon',
  external_id: 'ID123456',
  external_url: 'https://...',
  submitted_by_user_id: 42, // NEW - track who submitted
  scraped_at: '2024-01-15',
  // ... rest of fields
}
```

## 🚀 Następne kroki:

### Natychmiast (dzisiaj):
1. ✅ Analiza dokumentacji OLX API
2. ✅ Implementacja `metadataExtractor.js`
3. ✅ Implementacja `propertySubmissionService.js`
4. ✅ Implementacja `/api/properties/*` endpoints
5. ⏳ Testy submission flow

### Krótkoterminowe (1-2 tyg):
1. ⏳ Email do Gratka.pl (partner@gratka.pl)
2. ⏳ Email do Morizon.pl (formularz partnerski)
3. ⏳ Email do OLX B2B (partnerships@olxgroup.com)
4. ⏳ Email do Otodom B2B (otodom@grupazpr.pl)
5. ⏳ Implementacja gamification (punkty, badges)

### Długoterminowe (1-3 mies):
1. ⏳ Integracja z Gratka/Morizon API (jeśli uzyskamy dostęp)
2. ⏳ Negocjacje OLX/Otodom data partnership
3. ⏳ Feature: "Opublikuj na OLX" (OLX Publisher)
4. ⏳ Web scraping (tylko jako last resort)

## 📧 Email templates do wysłania:

### Do Gratka.pl:
```
Temat: Współpraca API - DomRadar agregator nieruchomości

Dzień dobry,

Nazywam się [NAME] i tworzę platformę agregującą ogłoszenia 
nieruchomości - DomRadar (domradar.pl).

Czy Gratka.pl oferuje API dla partnerów/agregatów?
Szukam legalnego dostępu do ogłoszeń w formie strukturalnej.

Chętnie omówię szczegóły współpracy.

Pozdrawiam,
[NAME]
```

### Do OLX B2B:
```
Subject: Data Partnership Inquiry - DomRadar Property Aggregator

Hello,

I'm building a property aggregation platform - DomRadar.
We discovered that OLX Partner API is for publishing ads only.

Is there a data partnership program for aggregators to access 
OLX property listings data?

We're interested in legal, structured data access.

Best regards,
[NAME]
```

## 🎓 Wnioski techniczne:

1. **OLX Partner API ≠ OLX Search API**
   - Partner API to publisher tool
   - Search API nie istnieje publicznie

2. **Otodom = OLX Group**
   - Ta sama infrastruktura OAuth
   - Ta sama dokumentacja Partner API
   - Brak public search API

3. **Legalna alternatywa:**
   - User-generated content
   - Metadata extraction (Open Graph)
   - Data partnerships (Gratka/Morizon)

4. **Przyszłość:**
   - OLX Publisher feature
   - Official data partnerships
   - Web scraping (tylko last resort)

## 📊 Metrics do trackowania:

```javascript
{
  "user_submissions": 156,
  "sources": {
    "olx": 89,
    "otodom": 45,
    "gratka": 22
  },
  "top_submitters": [
    { "user_id": 5, "submissions": 23 },
    { "user_id": 12, "submissions": 18 }
  ],
  "metadata_success_rate": 0.94
}
```

---

**Status:** ✅ Nowa architektura zaimplementowana
**Next:** Testy submission flow + emaile do data providers
