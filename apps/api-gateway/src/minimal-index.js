require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple API route
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'API Gateway is working!' });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`🚀 Simple API Gateway started on port ${port}`);
});
