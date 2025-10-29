/**
 * Chunk transcript into smaller pieces for processing
 * @param {string} transcript - Full transcript text
 * @param {number} chunkSize - Maximum characters per chunk (default: 4000)
 * @returns {Array<string>} Array of chunked transcript pieces
 */
export function chunkTranscript(transcript, chunkSize = 4000) {
  if (transcript.length <= chunkSize) {
    return [transcript]; // Single chunk, no splitting needed
  }

  const chunks = [];
  const lines = transcript.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    // If adding this line would exceed chunk size, save current chunk and start new one
    if (currentChunk.length + line.length + 1 > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }

    currentChunk += line + '\n';
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Create prompt for combining multiple chunk summaries
 * @param {Array<string>} chunkSummaries - Array of individual chunk summaries
 * @param {Object} metadata - Video metadata (title, channel, duration)
 * @returns {string} Combine prompt
 */
export function createCombinePrompt(chunkSummaries, metadata) {
  const { title, channel, duration } = metadata;

  let prompt = `You previously analyzed a long video in ${chunkSummaries.length} parts. Now combine these chunk summaries into one coherent, comprehensive final summary.\n\n`;

  prompt += `Video: ${title}\n`;
  prompt += `Channel: ${channel}\n`;
  prompt += `Duration: ${duration}\n\n`;

  prompt += `Individual Chunk Summaries:\n\n`;

  chunkSummaries.forEach((summary, index) => {
    prompt += `## Chunk ${index + 1} Summary:\n${summary}\n\n`;
  });

  prompt += `Instructions:\n`;
  prompt += `1. Merge all chunk summaries into one cohesive summary\n`;
  prompt += `2. Remove redundancies and consolidate overlapping information\n`;
  prompt += `3. Maintain chronological order where applicable\n`;
  prompt += `4. Preserve all important details, timestamps, and insights\n`;
  prompt += `5. Follow the original format style with proper headings and emojis\n`;
  prompt += `6. Ensure the final output is well-structured and comprehensive\n`;
  prompt += `7. Do NOT add introduction like "Here's the combined summary" - start directly with the content\n`;

  return prompt;
}

/**
 * Format duration in milliseconds to human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration (MM:SS or HH:MM:SS)
 */
export function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
