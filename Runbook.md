# PostgreSQL Admin Tool Runbook

## Table of Contents
- [Setup](#setup)
- [Starting the Application](#starting-the-application)
- [Stopping the Application](#stopping-the-application)
- [Debugging](#debugging)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Git Operations](#git-operations)
- [Database Management](#database-management)
- [API Endpoints](#api-endpoints)

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (v12 or higher)
- Git

### Environment Setup
1. Clone the repository:
```bash
git clone https://github.com/amakineni9/postgresadmintool.git
cd postgresadmintool
```

2. Create a `.env` file in the server directory:
```bash
cd server
touch .env
```

3. Add the following environment variables to the `.env` file:
```
PG_USER=your_postgres_username
PG_HOST=localhost
PG_PASSWORD=your_postgres_password
PG_PORT=5432
PORT=5000
KB_Key=your_gooseai_api_key
UPLOAD_DIR=uploads
```

4. Install server dependencies:
```bash
npm install
```

5. Install client dependencies:
```bash
cd ../client
npm install
```

## Starting the Application

### Start the Server
```bash
cd server
npm start
```

### Start the Server in Development Mode (with auto-reload)
```bash
cd server
npm run dev
```

### Start the Client
```bash
cd client
npm start
```

### Start Both Server and Client (from project root)
```bash
# Using concurrently (if installed)
npm install -g concurrently
concurrently "cd server && npm run dev" "cd client && npm start"

# Using separate terminals
# Terminal 1
cd server && npm run dev
# Terminal 2
cd client && npm start
```

## Stopping the Application

### Stop the Server or Client
Press `Ctrl+C` in the terminal where the server or client is running.

### Find and Kill Processes Using Specific Ports
```bash
# Find process using port 5000 (server)
netstat -ano | findstr :5000
# Kill the process (replace PID with the process ID from the previous command)
taskkill /F /PID PID

# Find process using port 3000 (client)
netstat -ano | findstr :3000
# Kill the process (replace PID with the process ID from the previous command)
taskkill /F /PID PID
```

## Debugging

### Server Debugging

#### Check Server Logs
```bash
cd server
npm run dev
```
This will start the server with nodemon and display logs in the console.

#### Debug Server with Node Inspector
```bash
cd server
node --inspect server.js
```
Then open Chrome and navigate to `chrome://inspect` to connect to the Node.js debugger.

#### Test Database Connection
```bash
cd server
node -e "const { Pool } = require('pg'); require('dotenv').config(); const pool = new Pool({ user: process.env.PG_USER, host: process.env.PG_HOST, database: 'postgres', password: process.env.PG_PASSWORD, port: process.env.PG_PORT }); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows); pool.end(); });"
```

### Client Debugging

#### Run React in Development Mode with Verbose Logging
```bash
cd client
REACT_APP_DEBUG=true npm start
```

#### Check for React Build Issues
```bash
cd client
npm run build
```

#### Run React Tests
```bash
cd client
npm test
```

## Common Issues and Solutions

### Server Won't Start
1. Check if the port is already in use:
```bash
netstat -ano | findstr :5000
```
2. Kill the process if needed:
```bash
taskkill /F /PID PID
```
3. Check environment variables:
```bash
cd server
node -e "console.log(require('dotenv').config())"
```

### Client Won't Start
1. Check if the port is already in use:
```bash
netstat -ano | findstr :3000
```
2. Kill the process if needed:
```bash
taskkill /F /PID PID
```
3. Clear npm cache:
```bash
npm cache clean --force
```
4. Delete node_modules and reinstall:
```bash
cd client
rm -rf node_modules
npm install
```

### API Connection Issues
1. Ensure the server is running
2. Check CORS settings in server.js
3. Verify API endpoints are correct in client code
4. Test API endpoints using curl or Postman:
```bash
curl http://localhost:5000/api/databases
```

### PostgreSQL Connection Issues
1. Verify PostgreSQL service is running:
```bash
# Check service status
sc query postgresql

# Start service if needed
net start postgresql
```
2. Check connection parameters in .env file
3. Test connection directly with psql:
```bash
psql -U username -h localhost -p 5432 postgres
```

## Git Operations

### Basic Git Workflow
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main
```

### Create and Switch to a New Branch
```bash
git checkout -b feature/new-feature
```

### Pull Latest Changes
```bash
git pull origin main
```

### Merge Branches
```bash
git checkout main
git merge feature/new-feature
```

### View Commit History
```bash
git log
```

## Database Management

### Connect to PostgreSQL
```bash
psql -U username -h localhost -p 5432 postgres
```

### List Databases
```bash
\l
```

### Connect to a Specific Database
```bash
\c database_name
```

### List Tables in Current Database
```bash
\dt
```

### View Table Structure
```bash
\d table_name
```

### Backup a Database
```bash
pg_dump -U username -h localhost -p 5432 database_name > backup.sql
```

### Restore a Database
```bash
psql -U username -h localhost -p 5432 database_name < backup.sql
```

## API Endpoints

### Excel to PostgreSQL Conversion
- **Upload Excel File**: `POST /api/upload`
  - Accepts multipart/form-data with a file field named 'file'
  - Creates a database named after the Excel file
  - Creates tables for each sheet in the Excel file

### Database Operations
- **List Databases**: `GET /api/databases`
- **Get Tables in Database**: `GET /api/database/:dbName/tables`
- **Get Table Structure**: `GET /api/database/:dbName/table/:tableName/structure`
- **Get Table Data**: `GET /api/database/:dbName/table/:tableName/data`
- **Update Record**: `PUT /api/database/:dbName/table/:tableName/record/:id`
- **Delete Records**: `DELETE /api/database/:dbName/table/:tableName/records`

### Knowledge Base Operations
- **Initialize Knowledge Base**: `POST /api/init-knowledge-base`
- **Search Knowledge Base**: `GET /api/kb/search?query=your_query`
- **Get Knowledge Base Topics**: `GET /api/kb/topics`
- **Get Knowledge Base Topic**: `GET /api/kb/topics/:id`
- **Create Knowledge Base Topic**: `POST /api/kb/topics`
- **Update Knowledge Base Topic**: `PUT /api/kb/topics/:id`
- **Delete Knowledge Base Topic**: `DELETE /api/kb/topics/:id`
- **Get Knowledge Base Tags**: `GET /api/kb/tags`