/* eslint-disable no-fallthrough */
const Sequelize = require('sequelize');

const {
  DATABASE: {
    name, username, password, options,
  },
} = require('../config');

const models = require('./models');

let database = {};

const sequelize = new Sequelize(name, username, password, { ...options });

database = models(sequelize);

database.Sequelize = Sequelize;
database.sequelize = sequelize;

database.authenticate = () => sequelize.authenticate();

database.close = async () => {
  try {
    await sequelize.close();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};

module.exports = database;
