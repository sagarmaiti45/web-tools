import express from 'express';
import { generateSummaryWithChunking } from '../services/summaryService.js';
import { getOpenRouterConfig } from '../services/openRouterService.js';

const router = express.Router();

/**
 * GET /api/summary/config
 * Get OpenRouter configuration (for frontend)
 */
router.get('/config', (req, res) => {
  try {
    const config = getOpenRouterConfig();

    // Return safe config info (without API key)
    res.json({
      success: true,
      data: {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        siteUrl: config.siteUrl,
        siteName: config.siteName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message
      }
    });
  }
});

/**
 * POST /api/summary/generate
 * Generate summary with streaming support
 *
 * Request body:
 * {
 *   transcriptData: { fullText, duration, videoId, language, transcript },
 *   videoMetadata: { title, channel },
 *   promptTemplate: "optional custom prompt"
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { transcriptData, videoMetadata, promptTemplate } = req.body;

    if (!transcriptData || !transcriptData.fullText) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'INVALID_REQUEST',
          message: 'Transcript data is required'
        }
      });
    }

    console.log(`Generating summary for video: ${transcriptData.videoId}`);
    console.log(`Transcript length: ${transcriptData.fullText.length} characters`);

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    // Generate summary with streaming
    for await (const event of generateSummaryWithChunking(transcriptData, videoMetadata, promptTemplate)) {
      // Send event as SSE format
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // If done, close connection
      if (event.type === 'done') {
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    }

    res.end();

  } catch (error) {
    console.error('Summary generation error:', error);

    // Send error event
    const errorEvent = {
      type: 'error',
      error: {
        message: error.message || 'Failed to generate summary',
        details: error.stack
      }
    };

    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    res.end();
  }
});

export default router;
