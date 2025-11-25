const scraperService = require('../services/scraperService');

/**
 * Manualnie uruchamia scraping
 * POST /api/scraper/run
 */
exports.runScraper = async (req, res) => {
  try {
    const { cities, maxPages, sources, fullDetails } = req.body;

    // Opcjonalna konfiguracja
    const options = {};
    if (cities) options.cities = cities;
    if (maxPages) options.maxPages = maxPages;
    if (sources) options.sources = sources;

    // Tymczasowa konfiguracja fullDetails
    if (fullDetails !== undefined) {
      scraperService.updateConfig({ fullDetailsEnabled: fullDetails });
    }

    const result = await scraperService.runOnce(options);

    return res.json({
      success: result.success,
      message: result.success ? 'Scraping zakończony pomyślnie' : 'Scraping zakończony z błędami',
      ...result
    });

  } catch (error) {
    console.error('Błąd w runScraper:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas uruchamiania scrapera',
      error: error.message
    });
  }
};

/**
 * Zwraca status scrapera
 * GET /api/scraper/status
 */
exports.getStatus = async (req, res) => {
  try {
    const status = scraperService.getStatus();

    return res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Błąd w getStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania statusu',
      error: error.message
    });
  }
};

/**
 * Uruchamia cron job
 * POST /api/scraper/cron/start
 */
exports.startCron = async (req, res) => {
  try {
    const { schedule } = req.body;

    scraperService.startCronJob(schedule);

    return res.json({
      success: true,
      message: 'Cron job uruchomiony',
      schedule: schedule || '0 2 * * *'
    });

  } catch (error) {
    console.error('Błąd w startCron:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas uruchamiania cron job',
      error: error.message
    });
  }
};

/**
 * Zatrzymuje cron job
 * POST /api/scraper/cron/stop
 */
exports.stopCron = async (req, res) => {
  try {
    scraperService.stopCronJob();

    return res.json({
      success: true,
      message: 'Cron job zatrzymany'
    });

  } catch (error) {
    console.error('Błąd w stopCron:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas zatrzymywania cron job',
      error: error.message
    });
  }
};

/**
 * Aktualizuje konfigurację scrapera
 * POST /api/scraper/config
 */
exports.updateConfig = async (req, res) => {
  try {
    const config = req.body;

    scraperService.updateConfig(config);

    return res.json({
      success: true,
      message: 'Konfiguracja zaktualizowana',
      config: scraperService.getStatus().config
    });

  } catch (error) {
    console.error('Błąd w updateConfig:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas aktualizacji konfiguracji',
      error: error.message
    });
  }
};
