const express = require('express');
const router = express.Router();
const RealTimeScraper = require('../services/realTimeScraper');
// const PropertySubmissionService = require('../services/propertySubmissionService');
// const { authenticateToken } = require('../middleware/auth');
const authenticateToken = (req, res, next) => next(); // Dummy middleware for MVP
// const { Property } = require('../models');
// const { Op } = require('sequelize');

// const submissionService = new PropertySubmissionService();

/**
 * GET /api/properties/search-stream
 * Progressive search with Server-Sent Events (SSE)
 * Results stream as they arrive from scrapers
 */
router.get('/search-stream', async (req, res) => {
  const { city, maxPages = 2 } = req.query;  // Reduced default from 5 to 2 pages

  if (!city) {
    return res.status(400).json({ error: 'City parameter required' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log(`🔍 Progressive search started: ${city}`);

  const scraper = new RealTimeScraper();

  try {
    await scraper.initialize();

    let totalResults = 0;

    // Send initial event
    res.write(`data: ${JSON.stringify({ 
      type: 'start', 
      city, 
      maxPages: parseInt(maxPages) 
    })}\n\n`);

    // Scrape page by page with streaming
    const scrapeWithProgress = async (source) => {
      const results = [];
      let page = 1;
      let consecutiveEmpty = 0;

      while (page <= parseInt(maxPages)) {
        try {
          const pageResults = [];
          
          // Callback to stream each property as it's parsed
          const onResult = (property) => {
            pageResults.push(property);
            totalResults++;
            
            // Stream individual property immediately
            res.write(`data: ${JSON.stringify({
              type: 'property',
              source,
              page,
              property,
              totalSoFar: totalResults
            })}\n\n`);
          };

          // Scrape page with progressive callback
          if (source === 'olx') {
            await scraper.scraper.scrapeOLX(city, page, onResult);
          } else if (source === 'otodom') {
            await scraper.scraper.scrapeOtodom(city, page, onResult);
          }

          if (pageResults.length === 0) {
            consecutiveEmpty++;
            if (consecutiveEmpty >= 2) break;
          } else {
            consecutiveEmpty = 0;
            results.push(...pageResults);

            // Send page complete event
            res.write(`data: ${JSON.stringify({
              type: 'page_complete',
              source,
              page,
              count: pageResults.length,
              totalSoFar: totalResults
            })}\n\n`);
          }

          page++;
          // NO delay between pages for maximum speed

        } catch (error) {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            source,
            page,
            error: error.message
          })}\n\n`);
          consecutiveEmpty++;
          if (consecutiveEmpty >= 2) break;
          page++;
        }
      }

      // Send completion event for this source
      res.write(`data: ${JSON.stringify({
        type: 'source_complete',
        source,
        totalFromSource: results.length
      })}\n\n`);

      return results;
    };

    // Scrape both sources in parallel
    await Promise.all([
      scrapeWithProgress('olx'),
      scrapeWithProgress('otodom')
    ]);

    // Send final completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      total: totalResults
    })}\n\n`);

    res.end();
    await scraper.close();

  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'fatal_error',
      error: error.message
    })}\n\n`);
    res.end();
    if (scraper.scraper) {
      await scraper.close();
    }
  }
});

/**
 * POST /api/properties/submit
 * Dodaj ogłoszenie przez link (user-generated content)
 * 
 * Body:
 * {
 *   "url": "https://www.olx.pl/d/oferta/mieszkanie-2-pokoje-warszawa-mokotow-ID123456.html"
 * }
 */
router.post('/submit', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL jest wymagany',
        example: {
          url: 'https://www.olx.pl/d/oferta/mieszkanie-ID123456.html'
        }
      });
    }

    // User ID z tokenu (opcjonalnie - guest może też dodawać)
    const userId = req.user?.id || null;

    console.log(`📥 Nowy submission od user ${userId || 'guest'}:`, url);

    const result = await submissionService.submitPropertyLink(url, userId);

    return res.status(result.status === 'created' ? 201 : 200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Błąd submission:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/properties/submit-batch
 * Batch submission (wymaga autoryzacji)
 * 
 * Body:
 * {
 *   "urls": ["url1", "url2", "url3"]
 * }
 */
router.post('/submit-batch', authenticateToken, async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'Array URLs jest wymagany',
        example: {
          urls: ['https://olx.pl/...', 'https://otodom.pl/...']
        }
      });
    }

    if (urls.length > 50) {
      return res.status(400).json({
        error: 'Maksymalnie 50 URLs na raz'
      });
    }

    const userId = req.user.id;
    
    console.log(`📥 Batch submission (${urls.length} URLs) od user ${userId}`);

    const results = await submissionService.submitBatch(urls, userId);

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Błąd batch submission:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/properties/submission-stats
 * Statystyki submissionów (dla zalogowanego użytkownika)
 */
router.get('/submission-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await submissionService.getSubmissionStats(userId);

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Błąd statystyk:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/properties
 * Lista wszystkich properties (własne + external)
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      source,
      city,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      rooms,
      propertyType,
      transactionType
    } = req.query;

    // Build where clause
    const where = {};
    
    if (source) where.source = source;
    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (propertyType) where.property_type = propertyType;
    if (transactionType) where.transaction_type = transactionType;
    if (rooms) where.rooms = parseInt(rooms);
    
    if (minPrice) {
      where.price = { ...where.price, [Op.gte]: parseFloat(minPrice) };
    }
    if (maxPrice) {
      where.price = { ...where.price, [Op.lte]: parseFloat(maxPrice) };
    }
    
    if (minArea) {
      where.area = { ...where.area, [Op.gte]: parseFloat(minArea) };
    }
    if (maxArea) {
      where.area = { ...where.area, [Op.lte]: parseFloat(maxArea) };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Property.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      properties: rows
    });

  } catch (error) {
    console.error('❌ Błąd pobierania properties:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/properties/:id
 * Szczegóły pojedynczego property
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const property = await Property.findByPk(id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property nie znaleziono'
      });
    }

    return res.status(200).json({
      success: true,
      property
    });

  } catch (error) {
    console.error('❌ Błąd pobierania property:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
