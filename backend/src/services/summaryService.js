import { streamFromOpenRouter, requestFromOpenRouter, getSystemPrompt, replaceVariables } from './openRouterService.js';
import { chunkTranscript, createCombinePrompt, formatDuration } from '../utils/chunkingUtils.js';

/**
 * Generate summary with chunking support
 * @param {Object} transcriptData - Transcript data from transcriptService
 * @param {Object} videoMetadata - Video metadata (title, channel)
 * @param {string} promptTemplate - User prompt template (optional)
 * @returns {AsyncGenerator} Yields events for streaming to frontend
 */
export async function* generateSummaryWithChunking(transcriptData, videoMetadata, promptTemplate = null) {
  const { fullText, duration } = transcriptData;
  const { title = 'Unknown Video', channel = 'Unknown Channel' } = videoMetadata;

  // Default prompt template if not provided
  const defaultPrompt = `Please provide a comprehensive summary of this YouTube video.

Video Title: {{TITLE}}
Channel: {{CHANNEL}}
Duration: {{DURATION}}

Transcript:
{{TRANSCRIPT}}`;

  const template = promptTemplate || defaultPrompt;

  // Determine if we need chunking (> 4000 characters)
  const needsChunking = fullText.length > 4000;

  if (!needsChunking) {
    // SINGLE CHUNK FLOW
    yield {
      type: 'metadata',
      videoId: transcriptData.videoId,
      totalChunks: 1,
      language: transcriptData.language
    };

    // Replace variables
    const userPrompt = replaceVariables(template, {
      TITLE: title,
      CHANNEL: channel,
      DURATION: formatDuration(duration),
      TRANSCRIPT: fullText
    });

    const messages = [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: userPrompt }
    ];

    // Stream directly to user
    for await (const chunk of streamFromOpenRouter(messages)) {
      yield chunk;
    }
  } else {
    // MULTI-CHUNK FLOW
    const chunks = chunkTranscript(fullText, 4000);
    const totalChunks = chunks.length;

    yield {
      type: 'metadata',
      videoId: transcriptData.videoId,
      totalChunks,
      language: transcriptData.language
    };

    console.log(`Processing video in ${totalChunks} chunks...`);

    const chunkSummaries = [];

    // Process each chunk individually (non-streaming, internal)
    for (let i = 0; i < totalChunks; i++) {
      yield {
        type: 'progress',
        current: i + 1,
        total: totalChunks,
        message: `Processing chunk ${i + 1} of ${totalChunks}...`
      };

      // Create chunk-specific prompt
      const chunkPrompt = replaceVariables(template, {
        TITLE: title,
        CHANNEL: channel,
        DURATION: formatDuration(duration),
        TRANSCRIPT: chunks[i],
        CHUNK_NUMBER: String(i + 1),
        TOTAL_CHUNKS: String(totalChunks)
      });

      const messages = [
        { role: 'system', content: getSystemPrompt() },
        {
          role: 'user',
          content: `This is part ${i + 1} of ${totalChunks} of a video transcript. Summarize this section:\n\n${chunkPrompt}`
        }
      ];

      // Get complete response for this chunk (non-streaming)
      const chunkSummary = await requestFromOpenRouter(messages);
      chunkSummaries.push(chunkSummary);

      console.log(`Chunk ${i + 1}/${totalChunks} processed`);
    }

    // Combining phase
    yield {
      type: 'combining_start',
      chunkSummaries,
      metadata: {
        title,
        channel,
        duration: formatDuration(duration)
      }
    };

    console.log('Combining all chunk summaries...');

    // Create combine prompt
    const combinePrompt = createCombinePrompt(chunkSummaries, {
      title,
      channel,
      duration: formatDuration(duration)
    });

    const combineMessages = [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: combinePrompt }
    ];

    // Stream the final combined summary to user
    for await (const chunk of streamFromOpenRouter(combineMessages)) {
      yield chunk;
    }
  }
}

/**
 * Simple summary generation without chunking (for testing)
 * @param {string} transcript - Transcript text
 * @param {Object} metadata - Video metadata
 * @returns {AsyncGenerator} Yields streaming response
 */
export async function* generateSimpleSummary(transcript, metadata) {
  const systemPrompt = getSystemPrompt();
  const userPrompt = `Summarize this video:\n\nTitle: ${metadata.title}\n\nTranscript: ${transcript}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  for await (const chunk of streamFromOpenRouter(messages)) {
    yield chunk;
  }
}
