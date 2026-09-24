# DomRadar 🏠📡

**DomRadar** - Nowoczesna platforma agregująca ogłoszenia nieruchomości z OLX i Otodom z interaktywną mapą, alertami i analizą otoczenia.

## 🚀 Główne funkcje

- 🗺️ **Interaktywna mapa** - Główny widok z wszystkimi nieruchomościami
- 🔔 **Alerty i powiadomienia** - Natychmiastowe powiadomienia o nowych ofertach
- 🏘️ **Analiza otoczenia** - Informacje o infrastrukturze, szkołach, komunikacji
- ⭐ **System opinii** - Opinie użytkowników o lokalizacjach
- 📊 **Statystyki rynkowe** - Trendy cenowe i analityka
- 💎 **Funkcje premium** - Wcześniejszy dostęp do ofert
- 🔍 **Zaawansowane filtrowanie** - Precyzyjne wyszukiwanie według wielu kryteriów

## 📋 Wymagania

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x z rozszerzeniem **PostGIS**
- **Docker** (opcjonalnie, dla łatwiejszego setup)
- **npm** lub **yarn**

## 🛠️ Instalacja

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/PawmelMeller/home-radar.git
cd home-radar
```

### 2. Instalacja zależności

```bash
npm install
```

### 3. Konfiguracja zmiennych środowiskowych

Skopiuj `.env.example` do `.env` i uzupełnij wartości:

```bash
cp .env.example .env
```

Wymagane: `JWT_SECRET` (serwer nie wystartuje bez niego). Schemat bazy jest ładowany
automatycznie przy pierwszym starcie kontenera Postgres z `db/schema.sql`.

### 4. Uruchomienie bazy danych (Docker)

```bash
docker-compose up -d
```

Lub zainstaluj PostgreSQL + PostGIS lokalnie.

### 5. Uruchomienie aplikacji

**Tryb deweloperski (frontend + backend jednocześnie):**

```bash
npm run dev
```

**Lub osobno:**

```bash
# Backend (port 5000)
npm run dev:backend

# Frontend (port 3000)
npm run dev:frontend
```

Aplikacja będzie dostępna pod adresem: **http://localhost:3000**

## 📁 Struktura projektu

```
home-radar/
├── apps/
│   ├── frontend/              # Aplikacja React (CRA) – na razie placeholder
│   └── backend/               # API Node.js/Express
│       ├── src/
│       │   ├── app.js         # Konfiguracja Express (bez listen – używana w testach)
│       │   ├── server.js      # Start serwera
│       │   ├── config/        # env.js (walidacja zmiennych), database.js (Sequelize)
│       │   ├── controllers/
│       │   ├── middleware/    # auth.js (JWT: authMiddleware, optionalAuth)
│       │   ├── models/        # User, Property (+ index.js)
│       │   ├── routes/        # auth, scraper, properties
│       │   ├── services/      # scraper, realTimeScraper, propertySubmissionService...
│       │   ├── public/        # Statyczne strony demo (serwowane pod /demo)
│       │   └── __tests__/     # Testy Jest + supertest
│       └── scripts/           # Ręczne skrypty testowe/debugowe (nie są częścią API)
├── packages/shared/           # Współdzielone stałe/typy
├── db/schema.sql              # Schemat bazy (PostgreSQL + PostGIS)
├── docs/                      # Notatki techniczne (OLX API, scraping, zmiany architektury)
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔌 API

| Metoda | Ścieżka | Opis | Auth |
|---|---|---|---|
| GET | `/health` | Health check | – |
| POST | `/api/auth/register` | Rejestracja | – |
| POST | `/api/auth/login` | Logowanie (zwraca JWT) | – |
| GET | `/api/auth/me` | Dane zalogowanego użytkownika | Bearer |
| GET | `/api/properties/search-stream?city=gdansk&maxPages=2` | Wyszukiwanie na żywo (SSE) | – |
| GET | `/api/properties` | Lista z bazy (filtry: city, minPrice, maxPrice, rooms…) | – |
| GET | `/api/properties/:id` | Szczegóły | – |
| POST | `/api/properties/submit` | Dodaj ogłoszenie przez link | opcjonalny |
| POST | `/api/properties/submit-batch` | Dodaj wiele linków | Bearer |
| POST | `/api/scraper/run` | Ręczne uruchomienie scrapera | Bearer |

## 🧪 Testowanie

```bash
# Wszystkie testy
npm run test

# Tylko backend
npm run test --workspace=apps/backend

# Tylko frontend
npm run test --workspace=apps/frontend
```

Backend testuje się bez bazy danych (smoke testy endpointów, walidacja, JWT).

## 🏗️ Build produkcyjny

```bash
npm run build
```

## 🚀 Deployment

### Opcja 1: Render.com

1. Połącz repozytorium z Render
2. Utwórz PostgreSQL database (z PostGIS)
3. Utwórz Web Service dla backendu
4. Utwórz Static Site dla frontendu

### Opcja 2: Vercel (Frontend) + Railway (Backend + DB)

1. Frontend: Deploy na Vercel
2. Backend + DB: Deploy na Railway

### Opcja 3: AWS

1. RDS dla PostgreSQL
2. EC2/ECS dla backendu
3. S3 + CloudFront dla frontendu

## 📚 Dokumentacja API

Po uruchomieniu backendu, dokumentacja API dostępna jest pod adresem:
**http://localhost:5000/api/docs**

## 🤝 Współpraca

1. Fork projektu
2. Utwórz branch (`git checkout -b feature/amazing-feature`)
3. Commit zmian (`git commit -m 'Add amazing feature'`)
4. Push do brancha (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

## 📝 Licencja

MIT License - Zobacz [LICENSE](LICENSE) dla szczegółów.

## 👥 Autorzy

- **DomRadar Team** - [GitHub](https://github.com/domradar)

## 🔗 Linki

- [Dokumentacja](https://docs.domradar.pl)
- [API Reference](https://api.domradar.pl/docs)
- [Roadmap](https://github.com/domradar/domradar/projects)
- [Issues](https://github.com/domradar/domradar/issues)

---

**DomRadar** - Zobacz pierwszy. Kup zanim inni. 🏠
