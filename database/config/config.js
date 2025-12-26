const {
  DATABASE: {
    name: database,
    username,
    password,
    options: { host, dialect },
  },
} = require('../../config');

module.exports = {
  username,
  password,
  database,
  host,
  dialect,
};
