process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

describe('Smoke: podstawowe endpointy', () => {
  test('GET /health zwraca OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('GET /api zwraca listę endpointów', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.endpoints).toBeDefined();
  });

  test('nieznana trasa zwraca 404 JSON', async () => {
    const res = await request(app).get('/api/nie-ma-takiej-trasy');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });

  test('kod źródłowy nie jest serwowany publicznie', async () => {
    const res = await request(app).get('/test/config/database.js');
    expect(res.status).toBe(404);
    const res2 = await request(app).get('/demo/../config/database.js');
    expect(res2.status).toBe(404);
  });
});

describe('Walidacja', () => {
  test('search-stream bez city zwraca 400', async () => {
    const res = await request(app).get('/api/properties/search-stream');
    expect(res.status).toBe(400);
  });

  test('search-stream z niebezpiecznym city zwraca 400', async () => {
    const res = await request(app).get('/api/properties/search-stream?city=../etc');
    expect(res.status).toBe(400);
  });

  test('register z błędnym emailem zwraca 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nie-email', password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('Autoryzacja', () => {
  test('chronione trasy bez tokenu zwracają 401', async () => {
    for (const path of ['/api/auth/me', '/api/scraper/status', '/api/properties/submission-stats']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  });

  test('nieprawidłowy token zwraca 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer to.nie.jest.token');
    expect(res.status).toBe(401);
  });

  test('wygasły token zwraca 401', async () => {
    const token = jwt.sign({ id: 1, email: 'a@b.pl' }, 'test-secret', { expiresIn: -10 });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token wygasł');
  });
});
