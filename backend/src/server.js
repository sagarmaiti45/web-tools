import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import transcriptRoutes from './routes/transcript.js';
import summaryRoutes from './routes/summary.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'YouTube Summarizer API is running',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/transcript', transcriptRoutes);
app.use('/api/summary', summaryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
