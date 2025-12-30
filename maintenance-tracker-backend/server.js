require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const client = new Anthropic();

// Simple file-based storage (replace with DB for production)
const DATA_FILE = path.join(__dirname, 'data', 'maintenance_records.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ records: [] }, null, 2));
}

// Helper functions
function getRecords() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data).records;
}

function saveRecords(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ records }, null, 2));
}

function addRecord(record) {
  const records = getRecords();
  record.id = Date.now().toString();
  record.createdAt = new Date().toISOString();
  records.push(record);
  saveRecords(records);
  return record;
}

// Authentication middleware (simple shared password)
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === process.env.AUTH_TOKEN || token === 'shared-secret-123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.LOGIN_PASSWORD || password === 'maintenance123') {
    res.json({ token: process.env.AUTH_TOKEN || 'shared-secret-123' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Get all records
app.get('/api/records', authenticate, (req, res) => {
  const records = getRecords();
  res.json(records);
});

// Upload and process image
app.post('/api/upload', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype; // e.g., 'image/jpeg', 'image/png'

    // Call Claude API with vision
    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Extract maintenance information from this receipt or invoice. Return ONLY a valid JSON object (no markdown, no extra text) with these fields:
- date (YYYY-MM-DD format, or null if not found)
- serviceType (string, e.g., "oil change", "tire rotation")
- cost (number, or null if not found)
- vendor (string, or null)
- notes (string with any other relevant details)
- vehicle (string, e.g., "Honda Civic", or null)
- mileage (number or null)

If you cannot determine a field, use null. Example output:
{"date":"2025-01-15","serviceType":"oil change","cost":45.99,"vendor":"Jiffy Lube","notes":"5W-30 synthetic","vehicle":"Honda Civic","mileage":75000}`,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    let extractedData;
    try {
      const responseText = message.content[0].text;
      extractedData = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Failed to parse maintenance data from image',
        details: parseError.message 
      });
    }

    // Save to records
    const record = addRecord(extractedData);
    res.json({ success: true, record });

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image', details: error.message });
  }
});

// Delete record
app.delete('/api/records/:id', authenticate, (req, res) => {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== req.params.id);
  saveRecords(filtered);
  res.json({ success: true });
});

// Update record
app.put('/api/records/:id', authenticate, (req, res) => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }
  records[index] = { ...records[index], ...req.body };
  saveRecords(records);
  res.json(records[index]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
