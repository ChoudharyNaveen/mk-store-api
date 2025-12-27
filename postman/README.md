# MK Store API - Postman Collection

This directory contains Postman collection and environment files for testing the MK Store API.

## Files

- **MK-Store-API.postman_collection.json** - Complete API collection with all endpoints
- **MK-Store-Environment.postman_environment.json** - Environment variables for API testing

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `MK-Store-API.postman_collection.json`
4. Click **Import**

### 2. Import Environment

1. Click **Environments** in the left sidebar
2. Click **Import**
3. Select `MK-Store-Environment.postman_environment.json`
4. Click **Import**
5. Select the **MK Store Environment** from the environment dropdown (top right)

### 3. Configure Base URL

1. Select **MK Store Environment** from the environment dropdown
2. Click the eye icon to view/edit variables
3. Update `baseUrl` if your server is running on a different host/port
   - Default: `http://localhost:4000`
   - Production: Update to your production URL

## Automatic Token Management

The collection is configured to automatically:

1. **Inject Token**: All authenticated requests automatically include the Bearer token from the environment variable
2. **Save Token**: When you login or verify OTP, the token from the response header is automatically saved to the environment

### How it works:

- **Collection-level Auth**: Bearer token authentication is set at the collection level
- **Pre-request Script**: Automatically injects token from environment if available
- **Test Script**: Automatically saves token from response headers (for login/OTP endpoints)

### Manual Token Update:

If you need to manually set the token:

1. Select **MK Store Environment**
2. Click the eye icon
3. Find `token` variable
4. Paste your JWT token
5. Click **Save**

## Using the Collection

### 1. Authentication Flow

1. **Send OTP**: Use `OTP > Send OTP SMS for User`
   - This will send OTP to the mobile number
   - Token is automatically saved when OTP is verified

2. **Verify OTP**: Use `OTP > Verify OTP SMS for User`
   - Enter the OTP code received
   - Token is automatically saved to environment

3. **OR Login**: Use `Authentication > Auth Login`
   - Enter mobile number and password
   - Token is automatically saved to environment

### 2. Making Authenticated Requests

Once you have a token (automatically saved), all other requests will automatically include it:

- All requests in the collection (except public endpoints) will have the token injected
- No need to manually add Authorization header

### 3. Update Requests

For update requests, you'll need to:

1. Get the `concurrencyStamp` from a previous GET request response
2. Update the `concurrencyStamp` environment variable
3. Or manually paste it in the request body/header

## Endpoint Categories

The collection is organized into the following folders:

- **Authentication** - User signup, login, admin creation
- **Users** - User management
- **OTP** - OTP sending and verification
- **Vendors** - Vendor CRUD operations
- **Branches** - Branch management
- **Categories** - Category management
- **SubCategories** - Subcategory management
- **Products** - Product CRUD operations
- **Cart** - Shopping cart operations
- **Orders** - Order management
- **Order Items** - Order item details
- **Addresses** - Address management
- **Wishlist** - Wishlist operations
- **Promocodes** - Promocode management
- **Offers** - Offer management
- **Test** - Test endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:4000` |
| `token` | JWT authentication token | (auto-filled) |
| `concurrencyStamp` | For optimistic locking | (manual) |
| `userId` | User ID for testing | `1` |
| `vendorId` | Vendor ID for testing | `1` |
| `branchId` | Branch ID for testing | `1` |
| `categoryId` | Category ID for testing | `1` |
| `productId` | Product ID for testing | `1` |

## Notes

- All file upload endpoints (products, categories, subcategories) require you to select a file in the form-data
- Update endpoints require `concurrencyStamp` from previous GET requests
- Some endpoints are public (no auth required): OTP endpoints, Get Vendor by Code, Test endpoint
- The collection uses Bearer token authentication at the collection level, so it applies to all requests automatically

## Troubleshooting

### Token not being saved
- Check that the response includes a `token` header
- Verify the test script is running (check Postman console)

### 401 Unauthorized
- Verify token is set in environment
- Check token hasn't expired
- Re-authenticate using login or OTP verification

### 409 Conflict (Concurrency Error)
- Get the latest `concurrencyStamp` from a GET request
- Update the `concurrencyStamp` variable or request body
- Retry the update request

