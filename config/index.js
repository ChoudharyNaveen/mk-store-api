const { version } = require('../package.json');
const path = require('path');
require('dotenv').config({
  path: path.resolve(
    process.cwd(),
    `.env.${process.env.NODE_ENV || 'development'}`
  ),
});

// Get the current environment, default to 'development'
const env = process.env.NODE_ENV || 'development';

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
        max: 100,
        min: 0,
        acquire: 1000 * 100,
        idle: 1000,
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
};
