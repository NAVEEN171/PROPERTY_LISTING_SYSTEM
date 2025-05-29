# Property Management System

A comprehensive full-stack property management application built with Node.js, Express, MongoDB, and Redis. This system provides efficient property listing management, user authentication, favorites functionality, and property recommendation services with advanced caching capabilities.

## 🚀 Features

### Core Features
- **User Authentication** - Secure JWT-based registration and login system
- **Property Management** - Complete CRUD operations with advanced filtering
- **Favorites System** - Users can save and manage their favorite properties
- **Property Recommendations** - Users can recommend properties to other registered users
- **Advanced Search** - Filter properties by 15+ attributes including location, price, amenities
- **Caching Layer** - Redis integration for optimized performance

### Advanced Capabilities
- **Smart Filtering** - Complex search with multiple criteria and sorting options
- **User Discovery** - Search users by email for property recommendations
- **Cache Management** - Intelligent cache invalidation and performance optimization
- **Data Validation** - Comprehensive input validation and error handling
- **Security** - Password hashing, JWT tokens

## 📁 Project Structure

```
property-management-system/
├── config/
│   ├── DB.js                    # MongoDB connection configuration
│   └── Redis.js                 # Redis connection and client setup
├── controllers/
│   ├── authControllers.js       # User authentication logic
│   ├── favouritesControllers.js # Favorites management operations
│   ├── propertiesControllers.js # Property CRUD and filtering
│   └── recommendationsControllers.js # Property recommendation system
├── helpers/
│   └── redisFunctions.js        # Redis utility functions and cache management
├── middleware/
│   └── auth.js                  # JWT authentication middleware
├── routes/
│   ├── authRoutes.js           # Authentication endpoints
│   ├── favouriteRoutes.js      # Favorites management routes
│   ├── propertiesRoutes.js     # Property management routes
│   └── recommendationsRoutes.js # Recommendation system routes
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies
├── package-lock.json           # Lock file for dependencies
└── server.js                   # Main application entry point
```

## 🛠️ Tech Stack

- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for performance optimization
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs for password hashing
- **Environment Management**: dotenv for configuration

## 📋 API Routes Overview

### Authentication Routes (`/api/auth`)
- `POST /signup` - User registration with validation
- `POST /login` - User authentication and token generation
- `POST /refresh-token` - Access token refresh using refresh token

### Property Routes (`/api/properties`)
- `GET /Get-properties` - Advanced property search with filtering and pagination
- `POST /add-property` - Create new property listing (Auth required)
- `GET /get-property/:propertyId` - Retrieve single property by ID
- `PUT /update-property/:propertyId` - Update property (Creator only)
- `DELETE /delete-property/:propertyId` - Delete property (Creator only)

### Favorites Routes (`/api/favourites`)
- `GET /` - Get user's favorite properties list
- `POST /add-favourite/:propertyId` - Add property to favorites
- `GET /get-favourite/:id` - Get single favorite by ID
- `PUT /update-favourite/:id` - Update favorite property
- `DELETE /delete-favourite/:id` - Remove property from favorites

### Recommendations Routes (`/api/recommendations`)
- `GET /search-users` - Search users by email for recommendations
- `POST /recommend-property` - Send property recommendation to user
- `GET /` - Get all sent and received recommendations

## 🔐 Authentication System

### JWT Implementation
The system uses a dual-token approach for secure authentication:

**Access Token**
- Expires in 30 minutes
- Used for API authorization
- Contains user ID and email

**Refresh Token**
- Expires in 1 day
- Used to generate new access tokens
- Stored securely for session management

### Auth Middleware
The authentication middleware (`middleware/auth.js`) provides:
- Bearer token extraction from Authorization header
- Token verification using ACCESS_TOKEN_SECRET
- Specific error codes for expired (`TOKEN_EXPIRED`) and invalid (`TOKEN_INVALID`) tokens
- User context attachment to request object

## 🎯 Controllers Deep Dive

### Authentication Controller (`authControllers.js`)

#### User Registration - `POST /api/auth/signup`
**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation:**
- All fields required
- Password minimum 8 characters
- Email must contain "@" symbol
- Email stored in lowercase

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user_object_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Error Responses:**
- `400` - Missing fields or invalid input
- `409` - User already exists
- `500` - Server error

#### User Login - `POST /api/auth/login`
**Request Body:**
```json
{
  "email": "john@example.com", 
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_object_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

#### Token Refresh - `POST /api/auth/refresh-token`
**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "new_jwt_access_token",
  "user": {
    "id": "user_object_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Properties Controller (`propertiesControllers.js`)

#### Advanced Property Search - `GET /api/properties/Get-properties`
**Authentication:** Required

**Query Parameters:**
- `title` - Search in property title (case-insensitive)
- `propertyTypes` - Filter by types (Apartment,Villa,Bungalow,Plot,Studio)
- `states` - Filter by states (comma-separated)
- `cities` - Filter by cities (comma-separated)
- `priceFrom` / `priceTo` - Price range filtering
- `areaSqFtFrom` / `areaSqFtTo` - Area range filtering
- `bedRooms` / `bathRooms` - Exact room count
- `rating` - Minimum rating (0-5)
- `listedBy` - Filter by listing type (Owner,Agent,Builder)
- `listingType` - sale or rent
- `furnishedTypes` - Furnished,Semi,Unfurnished
- `colorThemes` - Color theme filtering
- `isVerified` - Verification status
- `tags` - Required tags (comma-separated)
- `amenities` - Required amenities (comma-separated)
- `availableFrom` - Availability date
- `Page` - Pagination ( 10 per page)
- `sortBy` - Sort options (priceLowToHigh, rating, area)
- `sortOrder` - asc or desc

**Success Response (200):**
```json
{
  "properties": [
    {
      "_id": "property_object_id",
      "id": "property_custom_id",
      "title": "Luxury 2BHK Apartment",
      "type": "Apartment",
      "price": 25000,
      "state": "Karnataka",
      "city": "Bangalore",
      "areaSqFt": 1200,
      "bedrooms": 2,
      "bathrooms": 2,
      "amenities": "Swimming Pool|Gym|Parking",
      "furnished": "Semi",
      "availableFrom": "2025-06-01",
      "listedBy": "Owner",
      "tags": "Near Metro|Pet Friendly",
      "colorTheme": "#ffffff",
      "rating": 4.5,
      "isVerified": false,
      "listingType": "rent",
      "createdBy": "user_object_id"
    }
  ],
  "maxPaginatedPages": 5
}
```

#### Create Property - `POST /api/properties/add-property`
**Authentication:** Required

**Request Body:**
```json
{
  "id": "unique_property_id",
  "title": "Luxury 2BHK Apartment",
  "type": "Apartment",
  "price": 25000,
  "state": "Karnataka",
  "city": "Bangalore",
  "areaSqFt": 1200,
  "bedrooms": 2,
  "bathrooms": 2,
  "amenities": "Swimming Pool,Gym,Parking",
  "furnished": "Semi",
  "availableFrom": "2025-06-01",
  "listedBy": "Owner",
  "tags": "Near Metro,Pet Friendly",
  "colorTheme": "#ffffff",
  "rating": 4.5,
  "listingType": "rent"
}
```

**Required Fields:** id, title, type, price, state, city, areaSqFt, bedrooms, bathrooms, furnished, availableFrom, listedBy, listingType

**Validation Rules:**
- `type`: Apartment, Villa, Bungalow, Plot, Studio
- `furnished`: Furnished, Semi, Unfurnished
- `listedBy`: Owner, Agent, Builder
- `listingType`: sale or rent
- `price` and `areaSqFt`: Positive numbers
- `rating`: 0-5 range
- `id`: Must be unique

#### Get Single Property - `GET /api/properties/get-property/:propertyId`
**Authentication:** Not required (Public endpoint)

**Success Response (200):**
```json
{
  "data": {
    "_id": "mongodb_object_id",
    "id": "property_custom_id",
    "title": "Luxury 2BHK Apartment"
    // ... all property fields
  }
}
```

#### Update Property - `PUT /api/properties/update-property/:propertyId`
**Authentication:** Required
**Authorization:** Only property creator can update

**Request Body:** Any property fields to update

**Success Response (200):**
```json
{
  "message": "Property updated successfully",
  "data": {
    // ... updated property object
  }
}
```

#### Delete Property - `DELETE /api/properties/delete-property/:propertyId`
**Authentication:** Required
**Authorization:** Only property creator can delete

**Success Response (200):**
```json
{
  "message": "Property deleted successfully"
}
```

### Favorites Controller (`favouritesControllers.js`)

#### Get User Favorites - `GET /api/favourites/`
**Authentication:** Required

**Success Response (200):**
```json
{
  "message": "Favourites retrieved successfully",
  "count": 2,
  "favourites": [
    {
      "id": "favourite_object_id_1",
      "userId": "user_object_id",
      "propertyId": "property_id_1",
      "createdAt": "2025-05-29T10:30:00.000Z",
      "updatedAt": "2025-05-29T10:30:00.000Z"
    }
  ]
}
```

#### Add to Favorites - `POST /api/favourites/add-favourite/:propertyId`
**Authentication:** Required

**Success Response (201):**
```json
{
  "message": "Added to favourites successfully",
  "favourite": {
    "id": "favourite_object_id",
    "userId": "user_object_id",
    "propertyId": "property_id",
    "createdAt": "2025-05-29T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `409` - Property already in favorites

#### Get Single Favorite - `GET /api/favourites/get-favourite/:id`
**Authentication:** Required

**Success Response (200):**
```json
{
  "message": "Favourite retrieved successfully",
  "favourite": {
    "id": "favourite_object_id",
    "userId": "user_object_id",
    "propertyId": "property_id"
  }
}
```

#### Update Favorite - `PUT /api/favourites/update-favourite/:id`
**Authentication:** Required

**Request Body:**
```json
{
  "propertyId": "new_property_id"
}
```

#### Remove Favorite - `DELETE /api/favourites/delete-favourite/:id`
**Authentication:** Required

**Success Response (200):**
```json
{
  "message": "Favourite removed successfully"
}
```

### Recommendations Controller (`recommendationsControllers.js`)

#### Search Users - `GET /api/recommendations/search-users`
**Authentication:** Required

**Query Parameters:**
- `searchEmail` (required) - Email pattern to search for users

**Features:**
- Case-insensitive email search using regex pattern
- Returns up to 15 matching users
- Results cached for 10 minutes (600 seconds)
- Only returns user name and email fields

**Success Response (200):**
```json
{
  "users": [
    {
      "_id": "user_object_id_1",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    {
      "_id": "user_object_id_2", 
      "name": "Jane Smith",
      "email": "jane.smith@example.com"
    }
  ]
}
```

**Error Responses:**
- `400` - Missing searchEmail parameter
- `500` - Internal server error

#### Recommend Property - `POST /api/recommendations/recommend-property`
**Authentication:** Required

**Request Body:**
```json
{
  "email": "recipient@example.com",
  "propertyId": "property_custom_id"
}
```

**Validation Rules:**
- Both email and propertyId are required
- Cannot recommend property to yourself
- Cannot send duplicate recommendations to the same user for the same property
- Recipient user must exist in the system

**Features:**
- Creates recommendation record with pending status
- Invalidates recommendation cache for both sender and recipient
- Stores both sender and recipient user IDs for tracking

**Success Response (201):**
```json
{
  "recommendationId": "recommendation_object_id",
  "recommendedTo": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

**Error Responses:**
- `400` - Missing required fields or attempting to recommend to yourself
- `404` - Recommending user or recipient user not found
- `409` - Property already recommended to this user
- `500` - Internal server error

#### Get Recommendations - `GET /api/recommendations/`
**Authentication:** Required

**Features:**
- Retrieves both sent and received recommendations for the authenticated user
- Results cached for 15 minutes (900 seconds)
- Includes user details for recommenders and recipients
- Sorted by creation date (newest first)
- Separates recommendations into sent and received categories

**Success Response (200):**
```json
{
  "message": "Recommendations retrieved successfully",
  "received": [
    {
      "id": "recommendation_object_id_1",
      "propertyId": "property_custom_id_1",
      "recommendedBy": {
        "_id": "recommender_user_id",
        "name": "Jane Smith",
        "email": "jane.smith@example.com"
      },
      "createdAt": "2025-05-29T10:30:00.000Z",
      "status": "pending",
      "type": "received"
    }
  ],
  "sent": [
    {
      "id": "recommendation_object_id_2",
      "propertyId": "property_custom_id_2",
      "recommendedTo": {
        "_id": "recipient_user_id",
        "name": "John Doe",
        "email": "john.doe@example.com"
      },
      "createdAt": "2025-05-29T09:15:00.000Z",
      "status": "pending",
      "type": "sent"
    }
  ],
  "totalReceived": 1,
  "totalSent": 1
}
```

**Error Responses:**
- `500` - Internal server error

## ⚙️ Configuration Files

### Database Configuration (`config/DB.js`)
- MongoDB connection using Mongoose
- Connection caching to prevent multiple connections
- Environment-based connection string
- Error handling and connection monitoring

### Redis Configuration (`config/Redis.js`)
- Redis Cloud service connection
- Singleton pattern implementation
- Connection pooling and error handling
- Default key expiry configuration (30 minutes)

## 🔧 Redis Helper Functions (`helpers/redisFunctions.js`)

### Available Functions:
- `setKey(key, value, expiry)` - Store data with optional expiration
- `getKey(key)` - Retrieve data (auto-parses JSON)
- `deleteKey(key)` - Remove single key
- `deleteKeysByPattern(pattern)` - Bulk delete by pattern matching
- `keyExists(key)` - Check if key exists
- `setExpiry(key, expiry)` - Update key expiration time

### Caching Strategy:
- **Property Filters**: `properties:filtered:{encoded_params}`
- **Single Properties**: `property:{propertyId}`
- **User Favorites**: `favourites:user:{userId}`
- **Individual Favorites**: `favourite:{userId}:{favouriteId}`
- **User Search**: `search_users:{searchEmail}`
- **Recommendations**: `recommendations:{userId}`

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Redis server
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd property-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URL=your_mongodb_connection_string
   ACCESS_TOKEN_SECRET=your_access_token_secret_key
   REFRESH_TOKEN_SECRET=your_refresh_token_secret_key
   REDIS_CONN_PASSWORD=your_redis_password
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Verify installation**
   The server will run on `http://localhost:5000` (or your specified PORT)
