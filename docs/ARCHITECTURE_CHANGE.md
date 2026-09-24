# KRYTYCZNA ZMIANA ARCHITEKTURY - OLX/Otodom API

## Problem
Dokumentacja OLX Partner API (`olx_api.yaml`) ujawnia, że **nie istnieje publiczne API do pobierania ogłoszeń**.

### Co oferuje OLX Partner API:
- **POST /api/partner/adverts** - Tworzenie nowego ogłoszenia
- **GET /api/partner/adverts** - Pobieranie WŁASNYCH ogłoszeń użytkownika
- **PUT /api/partner/adverts/{id}** - Edycja WŁASNEGO ogłoszenia
- **DELETE /api/partner/adverts/{id}** - Usuwanie WŁASNEGO ogłoszenia
- Grant type `authorization_code` - wymaga logowania użytkownika OLX

### Czego NIE MA:
- ❌ Endpoint do wyszukiwania ogłoszeń innych użytkowników
- ❌ Publiczny dostęp do bazy ogłoszeń OLX/Otodom
- ❌ API do czytania ogłoszeń (tylko do publikowania własnych)

## Dostępne rozwiązania

### Opcja 1: Web Scraping (obecnie próbowana)
**Zalety:**
- Bezpośredni dostęp do wszystkich ogłoszeń
- Nie wymaga autoryzacji OLX

**Wady:**
- Blokady Cloudflare/bot detection (403 Forbidden)
- Naruszenie Terms of Service OLX/Otodom
- Wymaga utrzymywania parsera przy zmianach HTML
- Ryzyko prawne
- Brak stabilności

**Status:** ❌ **NIE ZALECANE** - blokady techniczne + problemy prawne

### Opcja 2: Data Providers / Affiliate Programs
**Możliwe źródła:**
- **Gratka.pl API** - oferują partner API dla agregatów
- **Morizon.pl API** - partner program
- **Arukereso.hu** (węgierski agregat - może mieć polskie dane)
- **Otodom** - kontakt z działem B2B (otodom@grupazpr.pl)
- **OLX** - kontakt z działem partnerstw (partnerships@olxgroup.com)

**Zalety:**
- Legalny dostęp
- Stabilne API
- Wsparcie techniczne
- Strukturyzowane dane

**Wady:**
- Koszty (często płatne)
- Proces zatwierdzania (dni/tygodnie)
- Ograniczenia rate limit
- Możliwe wymagania prawne

**Status:** ✅ **ZALECANE** - profesjonalne rozwiązanie

### Opcja 3: RSS/XML Feeds
**Możliwości:**
- Niektóre portale oferują RSS feeds
- XML feeds dla partnerów

**Status:** ⚠️ **DO ZBADANIA** - ograniczone dane

### Opcja 4: Manual Data Entry + User Generated Content
**Koncepcja:**
- Użytkownicy DomRadar dodają linki do ogłoszeń OLX/Otodom
- System wyciąga metadata (Open Graph, JSON-LD)
- Budowa własnej bazy community-driven

**Zalety:**
- Legalne
- Nie wymaga API OLX/Otodom
- Budowanie własnej społeczności

**Wady:**
- Wolny start (brak danych na początku)
- Zależność od aktywności użytkowników

**Status:** ✅ **ALTERNATYWA** - dla bootstrapped MVP

### Opcja 5: Hybrid Approach
**Strategia:**
1. **Faza 1 (MVP):** User submissions + metadata scraping
2. **Faza 2:** Kontakt z Gratka/Morizon dla oficjalnego API
3. **Faza 3:** Negocjacje z OLX/Otodom B2B
4. **Faza 4:** Własne ogłoszenia (użycie OLX Partner API do publikacji)

**Status:** ✅ **REKOMENDOWANE** - pragmatyczne podejście

## Rekomendowana strategia dla DomRadar MVP

### Krok 1: Kontakt z oficjalnymi źródłami (1-2 tygodnie)
```
1. Gratka.pl - wyślij email na partner@gratka.pl
   Temat: "Współpraca API - agregator nieruchomości DomRadar"
   
2. Morizon.pl - formularz partnerski na stronie
   
3. OLX Business - partnerships@olxgroup.com
   Zapytaj o dostęp do danych dla agregatów
   
4. Otodom B2B - otodom@grupazpr.pl
   Pytaj o API dla partnerów
```

### Krok 2: MVP z User Generated Content (teraz)
```javascript
// Nowa strategia dla MVP:
1. Endpoint: POST /api/properties/submit-link
   - Użytkownik wkleja link OLX/Otodom
   - Backend wyciąga Open Graph metadata
   - Zapisuje do bazy jako "external property"

2. Endpoint: GET /api/properties
   - Zwraca własne + external properties
   - Link do źródła (OLX/Otodom)

3. Gamification:
   - Punkty za dodawanie linków
   - Community ranking
   - Badges
```

### Krok 3: Metadata extraction (legalne)
```javascript
// Wyciąganie publicznych metadanych (Open Graph, JSON-LD)
// To jest LEGALNE - publiczne meta tagi

const extractMetadata = async (url) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  return {
    title: $('meta[property="og:title"]').attr('content'),
    price: $('meta[property="og:price:amount"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
    description: $('meta[property="og:description"]').attr('content'),
    source_url: url
  };
};
```

## OLX Partner API - co możemy z nim zrobić?

### Użycie w przyszłości (Faza 4):
```
1. Użytkownicy DomRadar mogą PUBLIKOWAĆ swoje ogłoszenia
2. Integracja "Dodaj ogłoszenie na OLX" button
3. Zarządzanie ogłoszeniami z DomRadar
4. Automatyczne odświeżanie ogłoszeń
```

### Implementacja:
- Zachować obecny kod `olxApiClient.js` 
- Zmienić nazwę na `olxPublisherClient.js`
- Dodać nowy moduł `propertySubmissionService.js`

## Action Items

### Natychmiastowe (dzisiaj):
1. ✅ Przeanalizuj dokumentację OLX API (DONE)
2. ⏳ Przemianuj `olxApiClient.js` → `olxPublisherClient.js`
3. ⏳ Usuń mock client (nie jest potrzebny do publikacji)
4. ⏳ Utwórz `propertySubmissionService.js` - user submissions
5. ⏳ Utwórz `metadataExtractor.js` - Open Graph scraping

### Krótkoterminowe (1-2 tygodnie):
1. ⏳ Wyślij emaile do Gratka/Morizon/OLX/Otodom
2. ⏳ Zaimplementuj user submission flow
3. ⏳ Dodaj metadata extraction
4. ⏳ Testy MVP z user-generated content

### Długoterminowe (1-3 miesiące):
1. ⏳ Negocjacje z data providers
2. ⏳ Integracja oficjalnego API (gdy uzyskamy dostęp)
3. ⏳ Implementacja OLX Publisher (users can post ads)
4. ⏳ Web scraping jako ostateczność (tylko jeśli nie ma alternatywy)

## Koszty i timeline

### MVP - User Submissions (Free, 1 tydzień)
- Bez kosztów
- Szybka implementacja
- Proof of concept

### Data Providers (€100-500/mies, 2-4 tygodnie setup)
- Gratka/Morizon API
- Oficjalne dane
- Stabilne

### OLX/Otodom B2B (negocjowane, 1-3 miesiące)
- Wymaga biznes case
- Możliwe revenue sharing
- Pełen dostęp

## Wnioski

❌ **OLX Partner API nie nadaje się do agregacji ogłoszeń**
✅ **Pivot na User Generated Content + metadata extraction**
✅ **Równolegle: kontakt z Gratka/Morizon/OLX B2B**
✅ **OLX Partner API zarezerwowane na przyszłość (publishing)**

## Pytania do klienta/PO:

1. Czy mamy budżet na płatne API (Gratka/Morizon)?
2. Czy akceptujemy MVP z user-generated content?
3. Czy możemy czekać 1-2 tygodnie na odpowiedzi od partnerów?
4. Czy w przyszłości chcemy funkcję "publikuj na OLX" dla użytkowników?
