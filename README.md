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
- **Rider FCM**: Rider FCM token management for push notifications

## Firebase Cloud Messaging (FCM) Setup

The application supports Firebase Cloud Messaging for sending push notifications to riders when orders are ready for pickup.

### Quick Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Generate a service account key (Project Settings > Service Accounts)
3. Add the credentials to your environment file:

```bash
# Option 1: Service Account Key (Recommended)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}

# Option 2: Project ID (For development)
FIREBASE_PROJECT_ID=your-firebase-project-id
```

For detailed setup instructions, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### Environment Variables

The application uses environment-specific `.env` files:
- `.env.development` - For development
- `.env.production` - For production

Required Firebase environment variables:
- `FIREBASE_SERVICE_ACCOUNT_KEY` - JSON string of service account credentials (recommended)
- `FIREBASE_PROJECT_ID` - Firebase project ID (alternative for development)