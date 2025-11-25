const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const authMiddleware = require('../middleware/auth');

// Wszystkie endpointy wymagają autoryzacji (tylko dla adminów)
// TODO: dodać middleware sprawdzający role admina

/**
 * @route   POST /api/scraper/run
 * @desc    Ręcznie uruchamia scraping
 * @access  Private (Admin)
 * @body    { cities?: string[], maxPages?: number, sources?: ['olx', 'otodom'], fullDetails?: boolean }
 */
router.post('/run', authMiddleware, scraperController.runScraper);

/**
 * @route   GET /api/scraper/status
 * @desc    Zwraca status scrapera
 * @access  Private (Admin)
 */
router.get('/status', authMiddleware, scraperController.getStatus);

/**
 * @route   POST /api/scraper/cron/start
 * @desc    Uruchamia automatyczny cron job
 * @access  Private (Admin)
 * @body    { schedule?: string } - cron format, np. '0 2 * * *'
 */
router.post('/cron/start', authMiddleware, scraperController.startCron);

/**
 * @route   POST /api/scraper/cron/stop
 * @desc    Zatrzymuje cron job
 * @access  Private (Admin)
 */
router.post('/cron/stop', authMiddleware, scraperController.stopCron);

/**
 * @route   POST /api/scraper/config
 * @desc    Aktualizuje konfigurację scrapera
 * @access  Private (Admin)
 * @body    { cities?: string[], maxPagesPerCity?: number, delayBetweenRequests?: number, fullDetailsEnabled?: boolean }
 */
router.post('/config', authMiddleware, scraperController.updateConfig);

module.exports = router;
