const {
  DATABASE: {
    name: database,
    username,
    password,
    options: { host, port, dialect },
  },
} = require('./index');

module.exports = {
  development: {
    username,
    password,
    database,
    host,
    port: port || 3306,
    dialect: dialect || 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER_NAME || username,
    password: process.env.DB_PASSWORD || password,
    database: process.env.DB_NAME || database,
    host: process.env.DB_HOST || host,
    port: process.env.DB_PORT || port || 3306,
    dialect: process.env.DB_DIALECT || dialect || 'mysql',
    logging: false,
  },
  test: {
    username,
    password,
    database: `${database}_test`,
    host,
    port: port || 3306,
    dialect: dialect || 'mysql',
    logging: false,
  },
};
