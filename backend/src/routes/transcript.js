import express from 'express';
import { getTranscript } from '../services/transcriptService.js';

const router = express.Router();

/**
 * GET /api/transcript/:videoId
 * Fetch transcript for a YouTube video
 */
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'INVALID_REQUEST',
          message: 'Video ID is required'
        }
      });
    }

    console.log(`Fetching transcript for video: ${videoId}`);

    const transcriptData = await getTranscript(videoId);

    res.json({
      success: true,
      data: transcriptData
    });

  } catch (error) {
    console.error('Transcript route error:', error);

    // Handle custom error format from transcriptService
    if (error.type) {
      return res.status(404).json({
        success: false,
        error: error
      });
    }

    res.status(500).json({
      success: false,
      error: {
        type: 'SERVER_ERROR',
        message: 'Failed to fetch transcript',
        details: error.message
      }
    });
  }
});

export default router;
