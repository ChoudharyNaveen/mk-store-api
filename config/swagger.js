const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MK Store Backend API',
      version: '1.0.0',
      description: 'E-commerce application backend API documentation with sample requests and responses',
      contact: {
        name: 'API Support',
        email: 'support@mkstore.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.mkstore.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            doc: {
              type: 'object',
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Vendors', description: 'Vendor management endpoints' },
      { name: 'Branches', description: 'Branch management endpoints' },
      { name: 'Categories', description: 'Category management endpoints' },
      { name: 'SubCategories', description: 'SubCategory management endpoints' },
      { name: 'Products', description: 'Product management endpoints' },
      { name: 'Cart', description: 'Shopping cart endpoints' },
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'OrderItems', description: 'Order item endpoints' },
      { name: 'Addresses', description: 'Address management endpoints' },
      { name: 'Wishlist', description: 'Wishlist management endpoints' },
      { name: 'Promocodes', description: 'Promocode management endpoints' },
      { name: 'Offers', description: 'Offer management endpoints' },
      { name: 'OTP', description: 'OTP verification endpoints' },
      { name: 'Test', description: 'Test endpoints' },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
