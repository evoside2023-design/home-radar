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
git clone https://github.com/your-username/domradar.git
cd domradar
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

### 4. Uruchomienie bazy danych (Docker)

```bash
docker-compose up -d
```

Lub zainstaluj PostgreSQL + PostGIS lokalnie.

### 5. Migracja bazy danych

```bash
npm run migrate --workspace=apps/backend
```

### 6. Uruchomienie aplikacji

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
domradar/
├── apps/
│   ├── frontend/          # Aplikacja React
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── context/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── backend/           # API Node.js/Express
│       ├── src/
│       │   ├── controllers/
│       │   ├── models/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── services/
│       │   └── utils/
│       └── package.json
│
├── packages/
│   └── shared/            # Współdzielone typy i utility
│       ├── types/
│       └── utils/
│
├── db/
│   └── schema.sql         # Skrypty inicjalizacyjne bazy danych
│
├── docker-compose.yml
├── .gitignore
├── .env.example
└── README.md
```

## 🧪 Testowanie

```bash
# Wszystkie testy
npm run test

# Tylko backend
npm run test --workspace=apps/backend

# Tylko frontend
npm run test --workspace=apps/frontend

# Z pokryciem kodu
npm run test:coverage
```

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
