const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Function to generate content using GooseAI
async function generateAIContent(prompt, title) {
  try {
    console.log('Generating content with GooseAI...');
    
    // Use direct axios call to GooseAI which we've confirmed works
    const response = await axios({
      method: 'post',
      url: 'https://api.goose.ai/v1/engines/gpt-j-6b/completions',
      headers: {
        'Authorization': `Bearer ${process.env.KB_Key}`,
        'Content-Type': 'application/json'
      },
      data: {
        prompt: `Generate detailed content about: ${title || 'Untitled Topic'}\n\nUser query: ${prompt}\n\nDetailed response:`,
        max_tokens: 1000,
        temperature: 0.7
      }
    });
    
    console.log('Content generated successfully with GooseAI');
    return response.data.choices[0].text;
  } catch (error) {
    console.error('Error with GooseAI API call:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Fallback to mock content generation if API fails
    console.log('Using mock content generation as fallback...');
    return generateMockContent(prompt, title);
  }
}

// Function to generate mock content when API is unavailable
function generateMockContent(prompt, title) {
  console.log('Generating mock content for:', title);
  
  // Create a basic structure based on the prompt and title
  const cleanTitle = title || 'Untitled Topic';
  const sections = prompt.split(/[.,;?!]\s+/).filter(s => s.length > 5).slice(0, 3);
  
  // Generate mock content with a structure
  return `# ${cleanTitle}

## Overview

This is a knowledge base article about ${cleanTitle}. ${prompt}

## Key Points

${sections.map((section, index) => `### ${section.trim().charAt(0).toUpperCase() + section.trim().slice(1)}

This section provides information about ${section.trim().toLowerCase()}. Additional details would be provided by the AI.

`).join('\n')}

## Resources

- [Official Documentation](https://example.com/docs)
- [Tutorial on ${cleanTitle}](https://example.com/tutorial)
- [Community Forum](https://example.com/forum)

*Note: This content was generated as a placeholder due to AI service unavailability. Please edit it to add accurate information.*`;
}

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// More lenient file filter that accepts more types of files
const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    console.log('Uploaded file:', file);
    console.log('Mimetype:', file.mimetype);
    
    // Accept more file types and be more lenient
    const filetypes = /xlsx|xls|spreadsheetml|ms-excel|application\/octet-stream/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = /xlsx|xls/.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype || extname) {
      return cb(null, true);
    }
    
    console.error('File rejected:', file.originalname, 'Mimetype:', file.mimetype);
    cb(new Error("Only Excel files are allowed! Please make sure your file has a .xlsx or .xls extension."));
  }
});

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: 'postgres', // Default database to connect to initially
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Helper function to sanitize identifiers for SQL
function sanitizeIdentifier(identifier) {
  // Remove special characters and spaces, replace with underscores
  return identifier.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

// Helper function to determine PostgreSQL data type from Excel value
function getPgDataType(value) {
  if (value === null || value === undefined) {
    return 'TEXT';
  }
  
  if (typeof value === 'number') {
    // Check if it's an integer
    return Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
  }
  
  if (typeof value === 'boolean') {
    return 'BOOLEAN';
  }
  
  if (value instanceof Date) {
    return 'TIMESTAMP';
  }
  
  // Default to TEXT for strings and other types
  return 'TEXT';
}

// API endpoint to upload Excel file and create database/tables
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded. Please select an Excel file.' });
    }

    console.log('File uploaded:', req.file.originalname);
    const filePath = path.join(uploadDir, req.file.filename);
    
    try {
      console.log('Reading Excel file from:', filePath);
      const workbook = xlsx.readFile(filePath, { 
        type: 'file',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: true
      });
      
      console.log('Excel file read successfully. Sheets:', workbook.SheetNames);
      
      if (workbook.SheetNames.length === 0) {
        console.error('Excel file has no sheets');
        // Clean up the uploaded file
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
        return res.status(400).json({ error: 'The Excel file has no sheets. Please upload a valid Excel file with data.' });
      }
      
      // Extract database name from the Excel file name (without extension)
      const excelFileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
      let dbName = sanitizeIdentifier(excelFileName);
      console.log('Database name will be:', dbName);
      
      // Check if database already exists
      try {
        const dbCheckResult = await pool.query(`
          SELECT 1 FROM pg_database WHERE datname = $1
        `, [dbName]);
        
        if (dbCheckResult.rows.length > 0) {
          console.log(`Database ${dbName} already exists, will try to drop it first`);
          
          try {
            // First, terminate all connections to the database
            await pool.query(`
              SELECT pg_terminate_backend(pg_stat_activity.pid)
              FROM pg_stat_activity
              WHERE pg_stat_activity.datname = $1
                AND pid <> pg_backend_pid()
            `, [dbName]);
            
            console.log(`Terminated all connections to database ${dbName}`);
            
            // Now try to drop the database
            await pool.query(`DROP DATABASE IF EXISTS ${dbName}`);
            console.log(`Successfully dropped database ${dbName}`);
          } catch (dropErr) {
            console.error(`Could not drop database ${dbName}:`, dropErr.message);
            // If we can't drop the database, create a unique name by adding a timestamp
            dbName = `${dbName}_${Date.now()}`;
            console.log(`Will use alternative database name: ${dbName}`);
          }
        }
        
        // Create a new database based on the Excel file name
        await pool.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created successfully`);
      } catch (err) {
        console.error('Error creating database:', err);
        // Clean up the uploaded file
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
        return res.status(500).json({ error: `Failed to create database: ${err.message}. Please check your PostgreSQL connection.` });
      }
      
      // Connect to the newly created database
      const dbPool = new Pool({
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: dbName,
        password: process.env.PG_PASSWORD,
        port: process.env.PG_PORT,
      });
      
      const createdTables = [];
      
      // Process each sheet in the workbook
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        
        // Log the raw worksheet data to see what's in it
        console.log('Worksheet data:', JSON.stringify(worksheet).substring(0, 500) + '...');
        
        // Try different methods to extract data from the sheet
        let data = [];
        try {
          // Method 1: Standard sheet_to_json
          data = xlsx.utils.sheet_to_json(worksheet);
          console.log(`Method 1: Extracted ${data.length} rows`);
          
          // If no data was extracted, try alternative methods
          if (data.length === 0) {
            // Method 2: Try with header:1 option
            const dataWithHeaders = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`Method 2: Extracted ${dataWithHeaders.length} rows`);
            
            if (dataWithHeaders.length > 1) {
              // Convert array format to object format
              const headers = dataWithHeaders[0];
              data = dataWithHeaders.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                  if (header) obj[header] = row[i];
                });
                return obj;
              });
              console.log(`Converted to ${data.length} data objects`);
            }
          }
          
          // Method 3: Try with range option if we still have no data
          if (data.length === 0) {
            // Get the range of the sheet
            const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
            console.log(`Sheet range: ${JSON.stringify(range)}`);
            
            // Try to extract data with explicit range
            data = xlsx.utils.sheet_to_json(worksheet, { 
              range: range,
              defval: null
            });
            console.log(`Method 3: Extracted ${data.length} rows using range`);
          }
        } catch (sheetErr) {
          console.error(`Error extracting data from sheet ${sheetName}:`, sheetErr);
        }
        
        if (data.length === 0) {
          console.log(`Sheet ${sheetName} appears to be empty, skipping`);
          continue;
        }
        
        console.log(`Sheet ${sheetName} has ${data.length} rows of data`);
        console.log('Sample data:', JSON.stringify(data.slice(0, 2)));
        
        // Create table name from sheet name
        const tableName = sanitizeIdentifier(sheetName);
        
        // Get column names and types from the first row
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        if (columns.length === 0) {
          console.log(`Sheet ${sheetName} has no columns, skipping`);
          continue;
        }
        
        console.log(`Table ${tableName} will have columns:`, columns);
        
        // Determine column types based on the data
        const columnDefinitions = columns.map(column => {
          const sanitizedColumn = sanitizeIdentifier(column);
          const dataType = getPgDataType(firstRow[column]);
          console.log(`Column ${column} -> ${sanitizedColumn} with type ${dataType}`);
          return `${sanitizedColumn} ${dataType}`;
        });
        
        // Create the table
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id SERIAL PRIMARY KEY,
            ${columnDefinitions.join(',\n            ')}
          )
        `;
        
        try {
          console.log(`Creating table ${tableName}...`);
          await dbPool.query(createTableQuery);
          console.log(`Table ${tableName} created successfully`);
          
          // Insert data into the table
          console.log(`Inserting ${data.length} rows into table ${tableName}...`);
          for (const row of data) {
            const columnNames = Object.keys(row).map(col => sanitizeIdentifier(col));
            const values = Object.values(row);
            const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
            
            const insertQuery = `
              INSERT INTO ${tableName} (${columnNames.join(', ')})
              VALUES (${placeholders})
            `;
            
            await dbPool.query(insertQuery, values);
          }
          
          createdTables.push({
            name: tableName,
            rowCount: data.length,
            columns: columnDefinitions.length
          });
          
          console.log(`Successfully inserted data into table ${tableName}`);
        } catch (err) {
          console.error(`Error processing table ${tableName}:`, err);
        }
      }
      
      // Close the database connection
      await dbPool.end();
      
      // Delete the uploaded file
      try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
      
      console.log('Process completed successfully');
      res.status(200).json({
        message: 'Excel file processed successfully',
        database: dbName,
        tables: createdTables
      });
    } catch (readError) {
      console.error('Error reading Excel file:', readError);
      // Clean up the uploaded file
      try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
      return res.status(500).json({ error: `Failed to read Excel file: ${readError.message}. Please make sure you're uploading a valid Excel file.` });
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: `Error processing file: ${error.message}. Please try again with a valid Excel file.` });
  }
});

// API endpoint to get a list of databases
app.get('/api/databases', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false AND datname != 'postgres'
    `);
    
    res.status(200).json(result.rows.map(row => row.datname));
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get tables in a database
app.get('/api/database/:dbName/tables', async (req, res) => {
  const { dbName } = req.params;
  
  // Create a new connection to the specified database
  const dbPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: dbName,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    const result = await dbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    await dbPool.end();
    
    res.status(200).json(result.rows.map(row => row.table_name));
  } catch (error) {
    console.error(`Error fetching tables for database ${dbName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get table data
app.get('/api/database/:dbName/table/:tableName/data', async (req, res) => {
  const { dbName, tableName } = req.params;
  
  // Create a new connection to the specified database
  const dbPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: dbName,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Get table structure
    const structureResult = await dbPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    
    // Get all data from the table
    const dataResult = await dbPool.query(`
      SELECT * FROM ${tableName}
    `);
    
    await dbPool.end();
    
    res.status(200).json({
      structure: structureResult.rows,
      data: dataResult.rows
    });
  } catch (error) {
    console.error(`Error fetching data for table ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to update a record
app.put('/api/database/:dbName/table/:tableName/record/:id', async (req, res) => {
  const { dbName, tableName, id } = req.params;
  const updateData = req.body;
  
  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No update data provided' });
  }
  
  // Create a new connection to the specified database
  const dbPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: dbName,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Build the SET clause for the UPDATE query
    const setClause = Object.keys(updateData)
      .map((key, index) => `${sanitizeIdentifier(key)} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updateData);
    values.push(id); // Add the ID as the last parameter
    
    // Execute the UPDATE query
    const updateQuery = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await dbPool.query(updateQuery, values);
    
    await dbPool.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Record with ID ${id} not found` });
    }
    
    res.status(200).json({
      message: 'Record updated successfully',
      record: result.rows[0]
    });
  } catch (error) {
    console.error(`Error updating record in table ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to delete records
app.delete('/api/database/:dbName/table/:tableName/records', async (req, res) => {
  const { dbName, tableName } = req.params;
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided for deletion' });
  }
  
  // Create a new connection to the specified database
  const dbPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: dbName,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Create placeholders for the IDs
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    
    // Execute the DELETE query
    const deleteQuery = `
      DELETE FROM ${tableName}
      WHERE id IN (${placeholders})
      RETURNING id
    `;
    
    const result = await dbPool.query(deleteQuery, ids);
    
    await dbPool.end();
    
    res.status(200).json({
      message: `${result.rows.length} record(s) deleted successfully`,
      deletedIds: result.rows.map(row => row.id)
    });
  } catch (error) {
    console.error(`Error deleting records from table ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to create a new record
app.post('/api/database/:dbName/table/:tableName/record', async (req, res) => {
  const { dbName, tableName } = req.params;
  const newData = req.body;
  
  if (!newData || Object.keys(newData).length === 0) {
    return res.status(400).json({ error: 'No data provided for new record' });
  }
  
  // Create a new connection to the specified database
  const dbPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: dbName,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Sanitize column names
    const columnNames = Object.keys(newData).map(key => sanitizeIdentifier(key));
    const values = Object.values(newData);
    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
    
    // Execute the INSERT query
    const insertQuery = `
      INSERT INTO ${tableName} (${columnNames.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await dbPool.query(insertQuery, values);
    
    await dbPool.end();
    
    res.status(201).json({
      message: 'Record created successfully',
      record: result.rows[0]
    });
  } catch (error) {
    console.error(`Error creating record in table ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to initialize knowledge base database and tables
app.post('/api/init-knowledge-base', async (req, res) => {
  try {
    // Check if searchdata database exists
    const dbCheckResult = await pool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'searchdata'
    `);
    
    // If searchdata database doesn't exist, create it
    if (dbCheckResult.rows.length === 0) {
      console.log('Creating searchdata database...');
      await pool.query(`CREATE DATABASE searchdata`);
      console.log('searchdata database created successfully');
    } else {
      console.log('searchdata database already exists');
    }
    
    // Connect to the searchdata database
    const searchDataPool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: 'searchdata',
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT,
    });
    
    // Create topics table
    await searchDataPool.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('topics table created or already exists');
    
    // Create notes table
    await searchDataPool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('notes table created or already exists');
    
    // Create tags table
    await searchDataPool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);
    console.log('tags table created or already exists');
    
    // Create topic_tags junction table
    await searchDataPool.query(`
      CREATE TABLE IF NOT EXISTS topic_tags (
        topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (topic_id, tag_id)
      )
    `);
    console.log('topic_tags table created or already exists');
    
    // Close the connection
    await searchDataPool.end();
    
    res.status(200).json({
      message: 'Knowledge base initialized successfully',
      database: 'searchdata',
      tables: ['topics', 'notes', 'tags', 'topic_tags']
    });
  } catch (error) {
    console.error('Error initializing knowledge base:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoints for knowledge base
// Get all topics
app.get('/api/kb/topics', async (req, res) => {
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    const result = await searchDataPool.query(`
      SELECT t.*, 
             COUNT(n.id) AS note_count,
             STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      LEFT JOIN notes n ON t.id = n.topic_id
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `);
    
    await searchDataPool.end();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search topics and notes
app.get('/api/kb/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Search in topics (title and description)
    const topicsResult = await searchDataPool.query(`
      SELECT t.*, 
             COUNT(n.id) AS note_count,
             STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      LEFT JOIN notes n ON t.id = n.topic_id
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.title ILIKE $1 OR t.description ILIKE $1
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `, [`%${query}%`]);
    
    // Search in notes content
    const notesResult = await searchDataPool.query(`
      SELECT t.*, 
             COUNT(n.id) AS note_count,
             STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      JOIN notes n ON t.id = n.topic_id
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE n.content ILIKE $1
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `, [`%${query}%`]);
    
    // Search in tags
    const tagsResult = await searchDataPool.query(`
      SELECT t.*, 
             COUNT(n.id) AS note_count,
             STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      LEFT JOIN notes n ON t.id = n.topic_id
      JOIN topic_tags tt ON t.id = tt.topic_id
      JOIN tags tg ON tt.tag_id = tg.id
      WHERE tg.name ILIKE $1
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `, [`%${query}%`]);
    
    // Combine results and remove duplicates
    const allTopics = [...topicsResult.rows, ...notesResult.rows, ...tagsResult.rows];
    const uniqueTopics = Array.from(new Map(allTopics.map(topic => [topic.id, topic])).values());
    
    await searchDataPool.end();
    
    res.status(200).json(uniqueTopics);
  } catch (error) {
    console.error('Error searching topics and notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single topic with its notes
app.get('/api/kb/topics/:id', async (req, res) => {
  const { id } = req.params;
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Get topic details
    const topicResult = await searchDataPool.query(`
      SELECT t.*, STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    if (topicResult.rows.length === 0) {
      await searchDataPool.end();
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Get notes for the topic
    const notesResult = await searchDataPool.query(`
      SELECT * FROM notes
      WHERE topic_id = $1
      ORDER BY created_at DESC
    `, [id]);
    
    // Get tags for the topic
    const tagsResult = await searchDataPool.query(`
      SELECT tg.id, tg.name
      FROM tags tg
      JOIN topic_tags tt ON tg.id = tt.tag_id
      WHERE tt.topic_id = $1
    `, [id]);
    
    await searchDataPool.end();
    
    res.status(200).json({
      ...topicResult.rows[0],
      notes: notesResult.rows,
      tagList: tagsResult.rows
    });
  } catch (error) {
    console.error(`Error fetching topic ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new topic
app.post('/api/kb/topics', async (req, res) => {
  const { title, description, tags } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Start a transaction
    await searchDataPool.query('BEGIN');
    
    // Create the topic
    const topicResult = await searchDataPool.query(`
      INSERT INTO topics (title, description)
      VALUES ($1, $2)
      RETURNING *
    `, [title, description || '']);
    
    const topicId = topicResult.rows[0].id;
    
    // Process tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        // Check if tag exists, create if not
        const tagResult = await searchDataPool.query(`
          INSERT INTO tags (name)
          VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = $1
          RETURNING id
        `, [tagName.trim()]);
        
        const tagId = tagResult.rows[0].id;
        
        // Create relationship between topic and tag
        await searchDataPool.query(`
          INSERT INTO topic_tags (topic_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [topicId, tagId]);
      }
    }
    
    // Commit the transaction
    await searchDataPool.query('COMMIT');
    
    // Get the complete topic with tags
    const completeTopicResult = await searchDataPool.query(`
      SELECT t.*, STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [topicId]);
    
    await searchDataPool.end();
    
    res.status(201).json({
      message: 'Topic created successfully',
      topic: completeTopicResult.rows[0]
    });
  } catch (error) {
    // Rollback in case of error
    await searchDataPool.query('ROLLBACK');
    console.error('Error creating topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a topic
app.put('/api/kb/topics/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, tags } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Start a transaction
    await searchDataPool.query('BEGIN');
    
    // Update the topic
    const topicResult = await searchDataPool.query(`
      UPDATE topics
      SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [title, description || '', id]);
    
    if (topicResult.rows.length === 0) {
      await searchDataPool.query('ROLLBACK');
      await searchDataPool.end();
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // If tags are provided, update them
    if (tags !== undefined) {
      // Remove existing tag relationships
      await searchDataPool.query(`
        DELETE FROM topic_tags
        WHERE topic_id = $1
      `, [id]);
      
      // Add new tags
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          // Check if tag exists, create if not
          const tagResult = await searchDataPool.query(`
            INSERT INTO tags (name)
            VALUES ($1)
            ON CONFLICT (name) DO UPDATE SET name = $1
            RETURNING id
          `, [tagName.trim()]);
          
          const tagId = tagResult.rows[0].id;
          
          // Create relationship between topic and tag
          await searchDataPool.query(`
            INSERT INTO topic_tags (topic_id, tag_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [id, tagId]);
        }
      }
    }
    
    // Commit the transaction
    await searchDataPool.query('COMMIT');
    
    // Get the complete topic with tags
    const completeTopicResult = await searchDataPool.query(`
      SELECT t.*, STRING_AGG(tg.name, ', ') AS tags
      FROM topics t
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    await searchDataPool.end();
    
    res.status(200).json({
      message: 'Topic updated successfully',
      topic: completeTopicResult.rows[0]
    });
  } catch (error) {
    // Rollback in case of error
    await searchDataPool.query('ROLLBACK');
    console.error(`Error updating topic ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a topic
app.delete('/api/kb/topics/:id', async (req, res) => {
  const { id } = req.params;
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Delete the topic (cascade will delete related notes and tag relationships)
    const result = await searchDataPool.query(`
      DELETE FROM topics
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    await searchDataPool.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.status(200).json({
      message: 'Topic deleted successfully',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error(`Error deleting topic ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add a note to a topic
app.post('/api/kb/topics/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Check if topic exists
    const topicResult = await searchDataPool.query(`
      SELECT id FROM topics WHERE id = $1
    `, [id]);
    
    if (topicResult.rows.length === 0) {
      await searchDataPool.end();
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Create the note
    const noteResult = await searchDataPool.query(`
      INSERT INTO notes (topic_id, content)
      VALUES ($1, $2)
      RETURNING *
    `, [id, content]);
    
    // Update the topic's updated_at timestamp
    await searchDataPool.query(`
      UPDATE topics
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    await searchDataPool.end();
    
    res.status(201).json({
      message: 'Note added successfully',
      note: noteResult.rows[0]
    });
  } catch (error) {
    console.error(`Error adding note to topic ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update a note
app.put('/api/kb/notes/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Update the note
    const noteResult = await searchDataPool.query(`
      UPDATE notes
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *, topic_id
    `, [content, id]);
    
    if (noteResult.rows.length === 0) {
      await searchDataPool.end();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Update the topic's updated_at timestamp
    await searchDataPool.query(`
      UPDATE topics
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [noteResult.rows[0].topic_id]);
    
    await searchDataPool.end();
    
    res.status(200).json({
      message: 'Note updated successfully',
      note: noteResult.rows[0]
    });
  } catch (error) {
    console.error(`Error updating note ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a note
app.delete('/api/kb/notes/:id', async (req, res) => {
  const { id } = req.params;
  
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    // Get the topic_id before deleting the note
    const topicResult = await searchDataPool.query(`
      SELECT topic_id FROM notes WHERE id = $1
    `, [id]);
    
    if (topicResult.rows.length === 0) {
      await searchDataPool.end();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const topicId = topicResult.rows[0].topic_id;
    
    // Delete the note
    const result = await searchDataPool.query(`
      DELETE FROM notes
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    // Update the topic's updated_at timestamp
    await searchDataPool.query(`
      UPDATE topics
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [topicId]);
    
    await searchDataPool.end();
    
    res.status(200).json({
      message: 'Note deleted successfully',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error(`Error deleting note ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get all tags
app.get('/api/kb/tags', async (req, res) => {
  const searchDataPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: 'searchdata',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  
  try {
    const result = await searchDataPool.query(`
      SELECT t.*, COUNT(tt.topic_id) AS topic_count
      FROM tags t
      LEFT JOIN topic_tags tt ON t.id = tt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `);
    
    await searchDataPool.end();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate content using GooseAI
app.post('/api/kb/generate-content', async (req, res) => {
  const { prompt, title } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  try {
    console.log('Generating content with AI...');
    console.log('Prompt:', prompt);
    console.log('Title:', title);
    
    // Use the new function that handles both methods
    const generatedContent = await generateAIContent(prompt, title);
    
    console.log('Content generated successfully');
    
    res.status(200).json({
      content: generatedContent
    });
  } catch (error) {
    console.error('Error generating content:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('API Error Status:', error.response.status);
    }
    
    // Check for account-related errors
    if (error.message.includes('Unable to find corresponding account') || 
        error.message.includes('authentication') ||
        error.message.includes('invalid_api_key')) {
      return res.status(401).json({
        error: 'AI API authentication error',
        details: 'There was an issue with your API key or account. Please check your credentials.',
        code: 'auth_error'
      });
    }
    
    // Check for quota exceeded error or other API errors
    if (error.code === 'insufficient_quota' || 
        error.message.includes('quota') || 
        error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'AI API quota exceeded',
        details: 'You have exceeded your API quota. Please try again later or use manual entry.',
        code: 'quota_exceeded'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
