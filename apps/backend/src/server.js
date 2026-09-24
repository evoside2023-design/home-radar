const env = require('./config/env');
const app = require('./app');
const { testConnection } = require('./config/database');

app.listen(env.port, async () => {
  console.log('='.repeat(50));
  console.log(`🚀 DomRadar Backend running on port ${env.port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API: http://localhost:${env.port}/api`);
  console.log('='.repeat(50));

  // Test połączenia z bazą (serwer działa dalej nawet gdy baza jest niedostępna)
  await testConnection();
});
