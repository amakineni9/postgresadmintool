# Excel to PostgreSQL Converter

A full-stack application that allows users to upload Excel files and automatically generate PostgreSQL databases and tables based on the Excel data.

## Features

- Upload Excel files (.xlsx, .xls)
- Automatically create a PostgreSQL database named after the Excel file
- Generate tables for each sheet in the Excel file
- Infer data types from the Excel data
- Browse created databases and tables
- View table structure and sample data

## Tech Stack

- **Frontend**: React.js with Bootstrap for UI
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **File Processing**: xlsx library for Excel parsing
- **File Upload**: Multer for handling multipart/form-data

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm (v6 or higher)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd excel-to-postgres-app
```

### 2. Install dependencies

For the server:
```bash
cd server
npm install
```

For the client:
```bash
cd client
npm install
```

### 3. Configure environment variables

Create a `.env` file in the server directory with the following variables:

```
PORT=5000
PG_USER=postgres
PG_HOST=localhost
PG_PORT=5432
PG_PASSWORD=your_postgres_password
UPLOAD_DIR=uploads
```

Replace `your_postgres_password` with your actual PostgreSQL password.

## Running the Application

### 1. Start the server

```bash
cd server
npm run dev
```

### 2. Start the client

```bash
cd client
npm start
```

The application will be available at http://localhost:3000

## How It Works

1. Upload an Excel file through the web interface
2. The server processes the file and creates a new PostgreSQL database named after the Excel file
3. For each sheet in the Excel file, a corresponding table is created
4. Data types are inferred from the Excel data
5. All data from the Excel sheets is imported into the corresponding tables
6. You can browse the created databases and tables through the web interface

## API Endpoints

- `POST /api/upload` - Upload and process an Excel file
- `GET /api/databases` - Get a list of all databases
- `GET /api/database/:dbName/tables` - Get a list of tables in a database
- `GET /api/database/:dbName/table/:tableName` - Get table structure and sample data

## License

MIT
