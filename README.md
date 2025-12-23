# mk-store-backend

E-commerce application backend API

## API Documentation

This project includes comprehensive Swagger/OpenAPI documentation for all endpoints.

### Accessing the Documentation

After starting the server, you can access the Swagger UI documentation at:

```
http://localhost:4000/api-docs
```

### Features

- Complete API documentation with request/response examples
- Interactive API testing through Swagger UI
- Authentication support (JWT Bearer tokens)
- Sample requests and responses for all endpoints

### Installing Dependencies

Before running the server, make sure to install the Swagger dependencies:

```bash
npm install
```

This will install `swagger-jsdoc` and `swagger-ui-express` along with other project dependencies.

### API Endpoints

The API documentation includes the following endpoint categories:

- **Authentication**: User login, signup (rider, customer, admin)
- **Users**: User management endpoints
- **Categories**: Category management
- **SubCategories**: Subcategory management
- **Products**: Product CRUD operations
- **Cart**: Shopping cart operations
- **Orders**: Order management and tracking
- **OrderItems**: Order item details
- **Addresses**: Address management
- **Wishlist**: Wishlist operations
- **Promocodes**: Promocode management
- **Offers**: Offer management
- **OTP**: OTP verification endpoints