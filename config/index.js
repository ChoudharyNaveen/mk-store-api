const path = require('path');
const { version } = require('../package.json');

require('dotenv').config({
  path: path.resolve(
    process.cwd(),
    `.env.${process.env.NODE_ENV || 'production'}`,
  ),
});

// Get the current environment, default to 'production' for Plesk compatibility
const env = process.env.NODE_ENV || 'production';

// All configuration reads from .env file
module.exports = {
  VERSION: version,
  ENV: env,
  DOMAIN: process.env.DOMAIN,
  SERVER: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 4000,
  },
  DATABASE: {
    name: process.env.DB_NAME,
    username: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    options: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      freezeTableName: true,
      define: {
        timestamps: false,
        charset: 'utf8',
        collate: 'utf8_general_ci',
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 1000,
      },
      dialectOptions: {
        decimalNumbers: true,
        charset: 'utf8mb4',
      },
      logging: process.env.DB_LOGGING === 'true' || false,
    },
  },
  jwt: {
    token_secret: process.env.JWT_TOKEN_SECRET,
    token_life: 2592000, // in seconds - 30 Days
  },
  NODEMAILER_SMS: {
    EMAIL: process.env.NODEMAILER_EMAIL,
    PASSWORD: process.env.NODEMAILER_PASSWORD,
  },
  AZURE_BLOB_KEY: process.env.AZURE_BLOB_KEY,
  AZURE_BLOB_CONNECTION_STRING: process.env.AZURE_BLOB_CONNECTION_STRING,
  AZURE_CONTAINER_NAME: process.env.AZURE_CONTAINER_NAME,
  AWS: {
    REGION: process.env.AWS_REGION || 'us-east-1',
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    CLOUDFRONT_DOMAIN: process.env.AWS_CLOUDFRONT_DOMAIN,
    SNS: {
      SMS_TYPE: process.env.AWS_SNS_SMS_TYPE || 'Transactional',
    },
    USE_MOCK_SMS: process.env.USE_MOCK_SMS === 'true' || false,
    MOCK_OTP: process.env.MOCK_OTP || '654321',
  },
  FIREBASE: {
    ENABLED: process.env.FIREBASE_ENABLED !== 'false',
    SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  },
  ROAD_DISTANCE_API: {
    url: process.env.ROAD_DISTANCE_API_URL,
    apiKey: process.env.ROAD_DISTANCE_API_KEY,
    timeout: parseInt(process.env.ROAD_DISTANCE_API_TIMEOUT) || 5000,
    enabled: process.env.ROAD_DISTANCE_API_ENABLED !== 'false',
    cache: {
      ttl: parseInt(process.env.ROAD_DISTANCE_CACHE_TTL) || 86400, // 24 hours in seconds
    },
    fallback: {
      haversineBuffer: parseFloat(process.env.ROAD_DISTANCE_FALLBACK_BUFFER) || 1.3,
    },
  },
};
