# MongoDB Setup for Invoice Swift

## Prerequisites

1. **Install MongoDB Community Server**
   - Download from: https://www.mongodb.com/try/download/community
   - Follow installation instructions for your OS
   - Or use MongoDB Atlas (cloud database)

2. **Start MongoDB Service**
   - **Windows**: MongoDB should start automatically as a service
   - **macOS**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

## Local MongoDB Setup

### Option 1: Local MongoDB Installation

1. **Install MongoDB Community Server**
   ```bash
   # Windows - Download and run installer
   # macOS
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Ubuntu/Debian
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```

2. **Start MongoDB**
   ```bash
   # Windows - Service should start automatically
   # macOS/Linux
   sudo systemctl start mongod
   # or
   mongod --dbpath /data/db
   ```

3. **Verify Installation**
   ```bash
   mongosh
   # Should connect to MongoDB shell
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create Account**: Go to https://cloud.mongodb.com
2. **Create Cluster**: Free tier available
3. **Get Connection String**: Copy your connection string
4. **Update .env**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoice-swift
   ```

## Environment Configuration

Update your `.env` file:

```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/invoice-swift
```

## Testing the Connection

1. **Start the backend server**:
   ```bash
   npm run dev
   ```

2. **Check console output**:
   ```
   MongoDB connected successfully
   Server running on port 5000
   ```

3. **Test with API calls**:
   ```bash
   # Signup
   curl -X POST http://localhost:5000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   
   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   ```

## Database Schema

The application uses the following collections:

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  company: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure MongoDB is running
   - Check if port 27017 is available
   - Verify connection string

2. **Authentication Failed**
   - Check username/password in connection string
   - Ensure user has proper permissions

3. **Database Not Found**
   - MongoDB creates databases automatically
   - Check if connection string includes database name

### Useful Commands

```bash
# Check MongoDB status
sudo systemctl status mongod

# View MongoDB logs
sudo journalctl -u mongod

# Connect to MongoDB shell
mongosh

# List databases
show dbs

# Use database
use invoice-swift

# View collections
show collections

# View users
db.users.find()
```


