export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/laytime_db?schema=public',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_for_laytime_dev_change_in_production',
    expiration: process.env.JWT_EXPIRATION || '3600s',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_change_in_production',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  storage: {
    path: process.env.STORAGE_PATH || './uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  },
  ocr: {
    provider: process.env.OCR_PROVIDER || 'MOCK',
    apiKey: process.env.OCR_API_KEY || 'mock_ocr_key_demo',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'MOCK',
    apiKey: process.env.EMAIL_API_KEY || 'mock_email_key_demo',
    from: process.env.EMAIL_FROM || 'notifications@laytime-demurrage.com',
  },
});