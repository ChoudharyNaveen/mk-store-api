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

// Load environment-specific configuration
let envConfig;
try {
  envConfig = require(`./environments/${env}`);
} catch (error) {
  console.warn(
    `Warning: Environment config for "${env}" not found. Falling back to development.`
  );
  envConfig = require('./environments/development');
}

// Merge base config with environment-specific config
module.exports = {
  VERSION: version,
  ENV: env,
  DOMAIN: process.env.DOMAIN,
  ...envConfig,
};
