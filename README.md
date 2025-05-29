# Property Management System

A full-stack property management application built with Node.js, Express, MongoDB, and Redis for efficient property listing, user management, and recommendation services.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose)
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs
- **Environment**: dotenv

## Project Structure

```
├── config/
│   ├── DB.js              # MongoDB connection configuration
│   └── Redis.js           # Redis connection configuration
├── controllers/
│   ├── authControllers.js      # Authentication logic
│   ├── favouritesControllers.js # Favorites management
│   ├── propertiesControllers.js # Property CRUD operations
│   └── recommendationsControllers.js # Recommendation system
├── helpers/
│   └── redisFunctions.js  # Redis utility functions
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   ├── authRoutes.js      # Authentication routes
│   ├── favouriteRoutes.js # Favorites routes
│   ├── propertiesRoutes.js # Property routes
│   └── recommendationsRoutes.js # Recommendation routes
├── .env                   # Environment variables
├── .gitignore
├── package.json
├── package-lock.json
└── server.js              # Main server file
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGODB_URL=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REDIS_CONN_PASSWORD=your_redis_password
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env` file
4. Start the server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:5000` (or your specified PORT).

## API Documentation

### Authentication Endpoints

All authentication endpoints are prefixed with `/api/auth`

#### 1. User Registration
- **Endpoint**: `POST /api/auth/signup`
- **Description**: Register a new user account
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Validation Rules**:
  - All fields (name, email, password) are required
  - Password must be at least 8 characters long
  - Email must contain "@" symbol
  - Email addresses are stored in lowercase
- **Success Response** (201):
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
- **Error Responses**:
  - `400`: Missing required fields or invalid input
  - `409`: User already exists with provided email
  - `500`: Internal server error

#### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Description**: Authenticate user and receive access tokens
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Success Response** (200):
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
- **Error Responses**:
  - `400`: Missing email or password
  - `401`: Invalid credentials (wrong email or password)
  - `500`: Internal server error

#### 3. Token Refresh
- **Endpoint**: `POST /api/auth/refresh-token`
- **Description**: Generate new access token using refresh token
- **Headers**:
  ```
  Authorization: Bearer <refresh_token>
  ```
- **Success Response** (200):
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
- **Error Responses**:
  - `401`: Refresh token not found or expired
  - `403`: Invalid refresh token or user not found
  - `500`: Server error during token refresh

### JWT Token Details

- **Access Token**: 
  - Expires in 30 minutes
  - Contains user ID and email
  - Required for protected routes
- **Refresh Token**: 
  - Expires in 1 day
  - Used to generate new access tokens
  - Contains user ID and email

### Authentication Middleware

The system uses JWT-based authentication middleware (`middleware/auth.js`) that:
- Extracts Bearer token from Authorization header
- Verifies token using ACCESS_TOKEN_SECRET
- Provides specific error codes for expired (`TOKEN_EXPIRED`) and invalid (`TOKEN_INVALID`) tokens
- Attaches user information to request object for downstream use

### Security Features

- **Password Hashing**: Uses bcryptjs with salt rounds of 10
- **Email Normalization**: All emails stored and compared in lowercase
- **Input Validation**: Server-side validation for required fields and formats
- **JWT Security**: Separate secrets for access and refresh tokens
- **Error Handling**: Comprehensive error responses without exposing sensitive information

## Database Configuration

### MongoDB Connection
- Uses Mongoose for MongoDB interactions
- Implements connection caching to prevent multiple connections
- Stores user data in "Users" collection
- Connection string configured via environment variable

### Redis Configuration
- Used for caching and session management
- Connects to Redis Cloud service
- Implements connection singleton pattern
- Default key expiry set to 1800 seconds (30 minutes)

### Redis Helper Functions
- `setKey(key, value, expiry)`: Store data with optional expiration
- `getKey(key)`: Retrieve data (auto-parses JSON)
- `deleteKey(key)`: Remove single key
- `deleteKeysByPattern(pattern)`: Bulk delete by pattern
- `keyExists(key)`: Check key existence
- `setExpiry(key, expiry)`: Update key expiration

## Favorites Management

All favorites endpoints are prefixed with `/api/favourites` and require authentication.

### Favorites Endpoints

#### 1. Add Property to Favorites
- **Endpoint**: `POST /api/favourites/add-favourite/:propertyId`
- **Description**: Add a property to user's favorites list
- **Authentication**: Required (Bearer token)
- **URL Parameters**:
  - `propertyId` (string): ID of the property to add to favorites
- **Success Response** (201):
  ```json
  {
    "message": "Added to favourites successfully",
    "favourite": {
      "id": "favourite_object_id",
      "userId": "user_object_id",
      "propertyId": "property_id",
      "createdAt": "2025-05-29T10:30:00.000Z",
      "updatedAt": "2025-05-29T10:30:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400`: PropertyId is required
  - `409`: Property already in favourites
  - `500`: Internal server error

#### 2. Get User's Favorites
- **Endpoint**: `GET /api/favourites/`
- **Description**: Retrieve all favorites for the authenticated user
- **Authentication**: Required (Bearer token)
- **Features**: 
  - Results cached in Redis for improved performance
  - Sorted by creation date (newest first)
- **Success Response** (200):
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
      },
      {
        "id": "favourite_object_id_2",
        "userId": "user_object_id",
        "propertyId": "property_id_2",
        "createdAt": "2025-05-29T09:15:00.000Z",
        "updatedAt": "2025-05-29T09:15:00.000Z"
      }
    ]
  }
  ```
- **Cached Response**: Returns same structure with message indicating "(from cache)"

#### 3. Get Single Favorite by ID
- **Endpoint**: `GET /api/favourites/get-favourite/:id`
- **Description**: Retrieve a specific favorite by its ID
- **Authentication**: Required (Bearer token)
- **URL Parameters**:
  - `id` (string): MongoDB ObjectId of the favorite
- **Features**: 
  - Individual favorite caching
  - User ownership validation
- **Success Response** (200):
  ```json
  {
    "message": "Favourite retrieved successfully",
    "favourite": {
      "id": "favourite_object_id",
      "userId": "user_object_id",
      "propertyId": "property_id",
      "createdAt": "2025-05-29T10:30:00.000Z",
      "updatedAt": "2025-05-29T10:30:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400`: Invalid favourite ID (not a valid ObjectId)
  - `404`: Favourite not found
  - `500`: Internal server error

#### 4. Update Favorite
- **Endpoint**: `PUT /api/favourites/update-favourite/:id`
- **Description**: Update the property associated with a favorite
- **Authentication**: Required (Bearer token)
- **URL Parameters**:
  - `id` (string): MongoDB ObjectId of the favorite to update
- **Request Body**:
  ```json
  {
    "propertyId": "new_property_id"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Favourite updated successfully",
    "favourite": {
      "id": "favourite_object_id",
      "userId": "user_object_id",
      "propertyId": "new_property_id",
      "createdAt": "2025-05-29T10:30:00.000Z",
      "updatedAt": "2025-05-29T11:45:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400`: Invalid favourite ID or PropertyId is required
  - `404`: Favourite not found
  - `500`: Internal server error

#### 5. Remove Favorite
- **Endpoint**: `DELETE /api/favourites/delete-favourite/:id`
- **Description**: Remove a property from user's favorites
- **Authentication**: Required (Bearer token)
- **URL Parameters**:
  - `id` (string): MongoDB ObjectId of the favorite to delete
- **Success Response** (200):
  ```json
  {
    "message": "Favourite removed successfully"
  }
  ```
- **Error Responses**:
  - `400`: Invalid favourite ID
  - `404`: Favourite not found
  - `500`: Internal server error

### Favorites Features

#### Data Model
- **Collection**: "Favourites" in MongoDB
- **Fields**:
  - `_id`: MongoDB ObjectId (auto-generated)
  - `userId`: ObjectId reference to user
  - `propertyId`: String ID of the property
  - `createdAt`: Date timestamp
  - `updatedAt`: Date timestamp

#### Caching Strategy
The favorites system implements Redis caching with the following keys:
- **User Favorites List**: `favourites:user:{userId}` - Caches all favorites for a user
- **Individual Favorite**: `favourite:{userId}:{favouriteId}` - Caches single favorite details

#### Cache Management
- **Cache Invalidation**: Automatically clears relevant cache keys after create, update, and delete operations
- **Cache Miss Handling**: Falls back to database query when cache is empty
- **Performance**: Reduces database load for frequently accessed favorites

#### Security Features
- **User Isolation**: Users can only access their own favorites
- **Ownership Validation**: All operations verify the favorite belongs to the authenticated user
- **Input Validation**: Validates ObjectId format and required fields
- **Duplicate Prevention**: Prevents adding the same property to favorites multiple times

#### Error Handling
- Comprehensive error responses with appropriate HTTP status codes
- Detailed error logging for debugging
- Graceful handling of invalid ObjectIds and missing resources

## Properties Management

Property endpoints are prefixed with `/api/properties`. Some endpoints require authentication while others are public.

### Property Endpoints

#### 1. Get Filtered Properties (with Pagination)
- **Endpoint**: `GET /api/properties/Get-properties`
- **Description**: Retrieve properties with advanced filtering, sorting, and pagination
- **Authentication**: Required (Bearer token)
- **Features**: 
  - Advanced filtering with multiple criteria
  - Redis caching for improved performance
  - Pagination support (10 properties per page)
  - Complex aggregation pipeline for tags and amenities

**Query Parameters** (all optional):
- **Filtering**:
  - `title` (string): Search in property title (case-insensitive)
  - `propertyTypes` (string): Comma-separated values (`Apartment,Villa,Bungalow,Plot,Studio`)
  - `states` (string): Comma-separated state names
  - `cities` (string): Comma-separated city names
  - `priceFrom` (number): Minimum price
  - `priceTo` (number): Maximum price
  - `areaSqFtFrom` (number): Minimum area in square feet
  - `areaSqFtTo` (number): Maximum area in square feet
  - `bedRooms` (number): Exact number of bedrooms
  - `bathRooms` (number): Exact number of bathrooms
  - `rating` (number): Minimum rating (0-5)
  - `listedBy` (string): Comma-separated values (`Owner,Agent,Builder`)
  - `listingType` (string): `sale` or `rent`
  - `furnishedTypes` (string): Comma-separated values (`Furnished,Semi,Unfurnished`)
  - `colorThemes` (string): Comma-separated color themes
  - `isVerified` (boolean): Property verification status
  - `tags` (string): Comma-separated tags (must match all)
  - `amenities` (string): Comma-separated amenities (must match all)
  - `availableFrom` (date): Properties available from this date

- **Pagination & Sorting**:
  - `Page` (number): Page number (default: 1)
  - `sortBy` (string): `priceLowToHigh`, `rating`, `area` (default: by availableFrom)
  - `sortOrder` (string): `asc` or `desc`

**Success Response** (200):
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

#### 2. Create Property
- **Endpoint**: `POST /api/properties/add-property`
- **Description**: Create a new property listing
- **Authentication**: Required (Bearer token)
- **Request Body**:
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

**Required Fields**: `id`, `title`, `type`, `price`, `state`, `city`, `areaSqFt`, `bedrooms`, `bathrooms`, `furnished`, `availableFrom`, `listedBy`, `listingType`

**Validation Rules**:
- `type`: Must be one of `Apartment`, `Villa`, `Bungalow`, `Plot`, `Studio`
- `furnished`: Must be one of `Furnished`, `Semi`, `Unfurnished`
- `listedBy`: Must be one of `Owner`, `Agent`, `Builder`
- `listingType`: Must be `sale` or `rent`
- `price` and `areaSqFt`: Must be positive numbers
- `bedrooms` and `bathrooms`: Cannot be negative
- `rating`: Must be between 0 and 5 (optional)
- `id`: Must be unique across all properties

**Success Response** (201):
```json
{
  "message": "Property created successfully",
  "data": {
    "_id": "mongodb_object_id",
    "id": "unique_property_id",
    "title": "Luxury 2BHK Apartment",
    // ... all property fields
    "isVerified": false,
    "createdBy": "user_object_id"
  }
}
```

**Error Responses**:
- `400`: Missing required fields, invalid validation, or duplicate property ID
- `500`: Internal server error

#### 3. Get Single Property
- **Endpoint**: `GET /api/properties/get-property/:id`
- **Description**: Retrieve a specific property by its custom ID
- **Authentication**: Not required (public endpoint)
- **URL Parameters**:
  - `id` (string): Custom property ID
- **Features**: Individual property caching

**Success Response** (200):
```json
{
  "data": {
    "_id": "mongodb_object_id",
    "id": "property_custom_id",
    "title": "Luxury 2BHK Apartment",
    // ... all property fields
  }
}
```

**Error Responses**:
- `400`: Property ID is required
- `404`: Property not found
- `500`: Internal server error

#### 4. Update Property
- **Endpoint**: `PUT /api/properties/update-property/:id`
- **Description**: Update an existing property (only by creator)
- **Authentication**: Required (Bearer token)
- **URL Parameters**:
  - `id` (string): Custom property ID
- **Authorization**: Only the user who created the property can update it

**Request Body** (all fields optional):
```json
{
  "title": "Updated Property Title",
  "price": 30000,
  "amenities": "Swimming Pool,Gym,Parking,Security",
  "rating": 4.8
}
```

**Validation**: Same validation rules as create property for updated fields

**Success Response** (200):
```json
{
  "message": "Property updated successfully",
  "data": {
    // ... updated property object with updatedAt timestamp
  }
}
```

**Error Responses**:
- `400`: Invalid property ID or validation errors
- `403`: Not authorized (only creator can update)
- `404`: Property not found
- `500`: Internal server error

#### 5. Delete Property
- **Endpoint**: `DELETE /api/properties/delete-property/:id`
- **Description**: Delete a property (only by creator)
- **Authentication**: Required (Bearer token)
- **URL Parameters**:
  - `id` (string): Custom property ID
- **Authorization**: Only the user who created the property can delete it

**Success Response** (200):
```json
{
  "message": "Property deleted successfully"
}
```

**Error Responses**:
- `400`: Property ID is required
- `403`: Not authorized (only creator can delete)
- `404`: Property not found
- `500`: Internal server error

### Property Features

#### Data Model
- **Collection**: "Properties" in MongoDB
- **Key Fields**:
  - `id`: Custom string ID (unique)
  - `_id`: MongoDB ObjectId (auto-generated)
  - `createdBy`: ObjectId reference to user who created the property
  - `isVerified`: Boolean (defaults to false)
  - `amenities` and `tags`: Stored as pipe-separated strings (`value1|value2|value3`)

#### Advanced Filtering System
- **Complex Aggregation Pipeline**: Handles tags and amenities as arrays for filtering
- **Range Filtering**: Price, area, and date range filtering
- **Multi-value Filtering**: Comma-separated values for types, cities, states
- **Text Search**: Case-insensitive title search using regex
- **Exact Match**: Bedrooms, bathrooms, rating filters

#### Caching Strategy
- **Filtered Results**: Cache key based on all query parameters (Base64 encoded)
- **Single Property**: Individual property caching by custom ID
- **Cache Patterns**: 
  - `properties:filtered:{encoded_params}` - Filtered property lists
  - `property:{propertyId}` - Individual properties
  - `properties:*` - All property-related cache pattern

#### Cache Management
- **Automatic Invalidation**: Clears relevant caches on create, update, delete
- **Pattern-based Clearing**: Uses Redis pattern matching for bulk cache invalidation
- **Performance Optimization**: Reduces database load for frequent queries

#### Security & Authorization
- **Creator-only Modifications**: Users can only update/delete properties they created
- **User Association**: All properties linked to creating user via `createdBy` field
- **Public Read Access**: Single property view doesn't require authentication
- **Protected Listing**: Filtered property search requires authentication

#### Data Processing
- **Date Formatting**: Converts dates to YYYY-MM-DD format using date-fns
- **String Processing**: Converts comma-separated inputs to pipe-separated storage
- **Type Conversion**: Ensures proper number types for numerical fields
- **Field Validation**: Comprehensive validation for all enum-type fields

---

## Recommendations Management

All recommendation endpoints are prefixed with `/api/recommendations` and require authentication.

### Recommendation Endpoints

#### 1. Search Users
- **Endpoint**: `GET /api/recommendations/search-users`
- **Description**: Search for users by email to send property recommendations
- **Authentication**: Required (Bearer token)
- **Features**:
  - Case-insensitive email search using regex
  - Redis caching for improved performance (10 minutes)
  - Limited to 15 results per search
  - Returns only name and email fields for privacy

**Query Parameters**:
- `searchEmail` (string, required): Email pattern to search for

**Success Response** (200):
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

**Error Responses**:
- `400`: Search word is required
- `500`: Internal server error

#### 2. Recommend Property
- **Endpoint**: `POST /api/recommendations/recommend-property`
- **Description**: Send a property recommendation to another user
- **Authentication**: Required (Bearer token)
- **Features**:
  - Prevents self-recommendations
  - Duplicate recommendation prevention
  - Automatic cache invalidation for both users

**Request Body**:
```json
{
  "email": "recipient@example.com",
  "featureId": "property_custom_id"
}
```

**Validation Rules**:
- Both `email` and `featureId` are required
- Cannot recommend to yourself
- Cannot send duplicate recommendations for the same property to the same user
- Recipient user must exist in the system

**Success Response** (201):
```json
{
  "recommendationId": "recommendation_object_id",
  "recommendedTo": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

**Error Responses**:
- `400`: Missing required fields or self-recommendation attempt
- `404`: Recommending user or recipient user not found
- `409`: Property already recommended to this user
- `500`: Internal server error

#### 3. Get Recommendations
- **Endpoint**: `GET /api/recommendations/`
- **Description**: Retrieve all recommendations (both sent and received) for the authenticated user
- **Authentication**: Required (Bearer token)
- **Features**:
  - Comprehensive view of all user's recommendation activity
  - Separate categorization of sent vs received recommendations
  - Redis caching for performance (15 minutes)
  - Sorted by creation date (newest first)
  - Includes detailed user information for context

**Success Response** (200):
```json
{
  "message": "Recommendations retrieved successfully",
  "received": [
    {
      "id": "recommendation_object_id_1",
      "featureId": "property_custom_id_1",
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
      "featureId": "property_custom_id_2",
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

**Error Responses**:
- `500`: Internal server error

### Recommendation Features

#### Data Model
- **Collection**: "Recommendations" in MongoDB
- **Fields**:
  - `_id`: MongoDB ObjectId (auto-generated)
  - `userId`: ObjectId reference to the user making the recommendation
  - `recommendedToUserId`: ObjectId reference to the user receiving the recommendation
  - `featureId`: String ID of the property being recommended
  - `createdAt`: Date timestamp
  - `status`: String status (`pending` by default)

#### Caching Strategy
The recommendations system implements Redis caching with the following keys:
- **User Search Results**: `search_users:{searchEmail}` - Caches user search results (10 minutes)
- **User Recommendations**: `recommendations:{userId}` - Caches all recommendations for a user (15 minutes)

#### Cache Management
- **Search Caching**: User search results cached for 10 minutes to reduce database load
- **Recommendation Caching**: Complete recommendation data cached for 15 minutes
- **Automatic Invalidation**: Clears cache for both recommending and recipient users when new recommendations are created
- **Performance Optimization**: Significantly reduces database queries for frequent recommendation views

#### Security Features
- **User Validation**: Verifies both recommending and recipient users exist
- **Self-Recommendation Prevention**: Users cannot recommend properties to themselves
- **Duplicate Prevention**: Prevents multiple recommendations of the same property to the same user
- **Email Normalization**: All email searches and comparisons use lowercase
- **Privacy Protection**: User search returns only essential fields (name, email)

#### Business Logic
- **Bidirectional View**: Users can see both recommendations they've sent and received
- **Status Tracking**: Recommendations have status field for potential workflow implementation
- **Comprehensive Filtering**: Retrieves all recommendation activity for a user in a single request
- **User Context**: Includes full user details for both recommenders and recipients

#### Error Handling
- **Comprehensive Validation**: Checks for required fields, user existence, and business rule violations
- **Detailed Error Messages**: Specific error messages for different failure scenarios
- **Graceful Degradation**: Handles missing users and database errors appropriately
- **Proper HTTP Status Codes**: Uses appropriate status codes for different error types

#### Performance Optimizations
- **Limited Search Results**: User search limited to 15 results to prevent performance issues
- **Efficient Queries**: Uses MongoDB projections to return only necessary fields
- **Optimized Aggregation**: Single query retrieves all recommendation data with user details
- **Strategic Caching**: Caches frequently accessed data with appropriate expiration times
