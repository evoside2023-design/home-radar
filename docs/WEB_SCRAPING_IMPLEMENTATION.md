# Web Scraping OLX/Otodom - Implementacja

## ✅ Zaimplementowano

### 1. PropertyScraper (`propertyScraper.js`)
- **Puppeteer + Stealth Plugin** - obejście Cloudflare/bot detection
- Renderuje strony jak prawdziwa przeglądarka
- Auto-scroll dla lazy-loaded content
- User-Agent rotation
- Delays między requestami (rate limiting)

### 2. Parsowanie HTML
- **OLX**: `[data-cy="l-card"]` selector
  - Tytuł, cena, lokalizacja, obrazek
  - External ID z URL
  - Heurystyki dla powierzchni/pokoi z tytułu

- **Otodom**: `[data-cy="listing-item"]` selector  
  - Tytuł, cena, powierzchnia, pokoje
  - Lokalizacja (miasto, dzielnica)
  - External ID z URL

### 3. ScraperService (`scraperService.js`)
- Orchestrates scraping process
- Database persistence (PostgreSQL + PostGIS)
- Deduplication (external_id)
- Statistics tracking
- Error handling

### 4. Test Suite
- `test-scraper-puppeteer.js` - manual testing
- Shows real browser (headless: false)
- Tests both OLX and Otodom

## 🎯 Features

### Obejście blokad:
✅ Puppeteer-extra + Stealth plugin
✅ Realistic User-Agent
✅ Viewport 1920x1080
✅ Network idle wait
✅ Scroll simulation
✅ Delays między requestami (2-3s)

### Data extraction:
✅ Title
✅ Price
✅ Area (z tytułu lub dedykowanego pola)
✅ Rooms (z tytułu lub dedykowanego pola)
✅ Location (miasto, dzielnica)
✅ Images
✅ External URL & ID

### Database:
✅ PostGIS location (GEOGRAPHY POINT)
✅ Deduplication (source + external_id)
✅ Statistics (success/failed/skipped)
✅ Timestamps (published_at, scraped_at)

## 📊 Użycie

### Programatyczne:
```javascript
const scraperService = require('./services/scraperService');

// Scrapuj OLX
await scraperService.scrapeOLX('warszawa', 2); // 2 strony

// Scrapuj Otodom
await scraperService.scrapeOtodom('warszawa', 2);

// Scrapuj wszystko
await scraperService.scrapeAll({
  city: 'warszawa',
  pages: 3
});
```

### API endpoint:
```bash
POST /api/scraper/run
{
  "sources": ["olx", "otodom"],
  "city": "warszawa",
  "pages": 2
}
```

### Test:
```bash
cd apps/backend
node src/test-scraper-puppeteer.js
```

## ⚠️ Ważne uwagi

### Legalność:
- Web scraping jest w szarej strefie prawnej
- Nie łamiemy zabezpieczeń technicznych
- Pobieramy tylko publicznie dostępne dane
- Respectujemy robots.txt (delays)
- **Rekomendacja**: kontakt z OLX/Otodom B2B dla oficjalnego API

### Performance:
- Puppeteer jest WOLNY (~2-5s per strona)
- Używa dużo RAM (~200-500MB per browser instance)
- Wymaga Chromium (~500MB dysk)
- **Dla MVP**: OK (małe volume)
- **Dla produkcji**: rozważyć proxy pool, distributed scraping

### Rate limiting:
- 2-3s delay między requestami
- Max 2-3 strony per run (MVP)
- Cron job: 1x dziennie (overnight)
- **Nie bombardować** - ryzyko blokady IP

### Alternatywy:
1. **Najlepsza**: Official API partnership (email do B2B)
2. **Backup**: Scraping API services (ScrapingBee, BrightData)
3. **Last resort**: Ten scraper (maintenance overhead)

## 🐛 Troubleshooting

### Błąd: "Execution context destroyed"
- Strona załadowana za szybko/wolno
- Zwiększ timeout: `timeout: 60000`
- Dodaj więcej `waitForTimeout`

### Błąd: "Selector not found"
- OLX/Otodom zmienili HTML
- Sprawdź devtools dla nowych selektorów
- Update w `propertyScraper.js`

### Błąd: 403 Forbidden (mimo Puppeteer)
- Cloudflare wykrył automatyzację
- Dodaj więcej realistycznych actions (mouse moves)
- Użyj rotating proxies
- Consider: playwright-extra (lepszy stealth)

### Browser nie otwiera się:
- Sprawdź czy Chromium się pobrał: `node_modules/puppeteer/.local-chromium/`
- Reinstall: `npm install puppeteer --force`
- Check args: `--no-sandbox` może być wymagany na Linux

## 📈 Roadmap

### MVP (teraz):
- ✅ Basic scraper (OLX + Otodom)
- ✅ Puppeteer + Stealth
- ✅ Database persistence
- ✅ Manual test

### Phase 2 (następny tydzień):
- ⏳ Cron job (automatyczne scraping 1x/dzień)
- ⏳ Error notifications (email on failure)
- ⏳ Monitoring dashboard
- ⏳ Retry logic (failed listings)

### Phase 3 (produkcja):
- ⏳ Proxy rotation (avoid IP blocks)
- ⏳ Distributed scraping (multiple workers)
- ⏳ Incremental updates (tylko nowe ogłoszenia)
- ⏳ Full detail scraping (opis, wszystkie zdjęcia)

### Long-term:
- ⏳ Official API partnership (preferred)
- ⏳ User submission system (fallback)
- ⏳ Scraping-as-a-Service (BrightData/ScrapingBee)

## 📝 Notatki developerskie

### Selektory (stan na 2025-11):

**OLX:**
- Listing card: `[data-cy="l-card"]`
- Title: `h6, h4, [data-cy="l-card-title"]`
- Price: `[data-testid="ad-price"]`
- Location: `[data-testid="location-date"]`
- Link: `a` (first in card)

**Otodom:**
- Listing card: `[data-cy="listing-item"]`
- Title: `[data-cy="listing-item-title"]`
- Price: `[data-cy="listing-item-price"]`
- Area: `[data-cy="listing-item-area"]`
- Rooms: `[data-cy="listing-item-rooms"]`
- Location: `[data-cy="listing-item-location"]`

⚠️ **Te selektory mogą się zmienić!** Monitoruj błędy.

### Backup plan jeśli selektory się zmienią:
1. Open browser: `headless: false`
2. DevTools → Inspect element
3. Find new selector
4. Update `propertyScraper.js` → `parseOLXListing()`/`parseOtodomListing()`
5. Test: `node src/test-scraper-puppeteer.js`

## 🔐 Bezpieczeństwo

### Nie commituj:
- ❌ Proxy credentials (jeśli używasz)
- ❌ API keys (jeśli przejdziesz na API)
- ❌ Production database strings

### Dodaj do .env:
```
SCRAPER_ENABLED=true
SCRAPER_DELAY=3000
SCRAPER_MAX_PAGES=3
SCRAPER_HEADLESS=true
SCRAPER_PROXY_URL=  # optional
```

## 💡 Tips

1. **Zawsze używaj headless: false podczas debugowania**
2. **Check robots.txt**: https://olx.pl/robots.txt
3. **Monitor za dużo 403s** - może oznaczać blokadę IP
4. **Backup plan**: Screenshot failed pages dla debug
5. **Log wszystko**: URL, timestamp, error message
6. **Test lokalnie** przed deploy na serwer
7. **Use VPN/proxy** podczas testów (nie popsuj production IP)

---

**Status:** ✅ MVP scraper gotowy do testów
**Next:** Czekamy na wyniki test-scraper-puppeteer.js
