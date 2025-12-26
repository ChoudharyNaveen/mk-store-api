'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');

const routes = require('./routes');
const indexRouter = require('./routes/indexRouter');
const { cronJobForUpdatingOfferStatus } = require('./services/offerService');

const app = express();

app.enable('trust proxy');

app.use(
  cors({
    exposedHeaders: [
      'token',
      'slug',
      'message',
      'set-password',
      'password',
      'is-password-already-set',
      'public-id',
      'x-coreplatform-paging-limit',
      'x-coreplatform-total-records',
      'x-concurrencystamp',
      'Content-Type',
      'Content-disposition',
    ],
  })
);

app.use(compression());
app.use(helmet());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));


app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
  });
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('MK Store Backend is running');
});


app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MK Store API Documentation',
  })
);

app.use('/public', routes);
app.use('/api', routes);
app.use('/api/test', indexRouter);

app.use((err, req, res, next) => {
  console.error('Error caught by middleware:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});


cronJobForUpdatingOfferStatus();


const port = process.env.PORT;

if (!port) {
  console.error('PORT not provided by Plesk');
  process.exit(1);
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV}`);
});


module.exports = app;
