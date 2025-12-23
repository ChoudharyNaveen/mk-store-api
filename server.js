const express = require('express')
const cors = require('cors')
const compression = require('compression')
const helmet = require('helmet')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const NodeHttp = require('inblox-node-http')
const routes = require('./routes')
const indexRouter = require('./routes/indexRouter')
const { cronJobForUpdatingOfferStatus } = require('./services/offerService')

const {
  SERVER: { port },
} = require('./config')

const server = express()
const app = server.listen(port, async () => {
  console.log(`🚀 Server ready at http://localhost:${port}`)
})
try {
  server.enable('trust proxy')
  server.use('/', NodeHttp({ sendStatusCodeinRespose: true }), routes)
  cronJobForUpdatingOfferStatus()
  server.use(
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
        'public-id',
        'Content-Type',
        'Content-disposition',
        'message',
      ],
    })
  )
  server.use(compression())
  server.use(helmet())
  server.use(
    express.urlencoded({
      extended: true,
    })
  )
  server.use(express.json())
  
  // Swagger Documentation
  server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MK Store API Documentation',
  }))
  
  server.use('/public', routes)
  server.use('/api/test', indexRouter)
  server.use('/api', routes)
} catch (e) {
  app.close()
}

module.exports = server
