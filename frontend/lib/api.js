const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Fetch transcript for a YouTube video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Transcript data
 */
export async function fetchTranscript(videoId) {
  try {
    const response = await fetch(`${API_URL}/api/transcript/${videoId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Failed to fetch transcript: ' + error.message);
  }
}

/**
 * Generate summary with streaming support
 * @param {Object} transcriptData - Transcript data from fetchTranscript
 * @param {Object} videoMetadata - Video metadata (title, channel)
 * @param {Function} onChunk - Callback for each chunk received
 * @param {Function} onComplete - Callback when streaming is complete
 * @param {Function} onError - Callback for errors
 */
export async function generateSummary(
  transcriptData,
  videoMetadata,
  onChunk,
  onComplete,
  onError
) {
  try {
    const response = await fetch(`${API_URL}/api/summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptData,
        videoMetadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete();
        break;
      }

      // Decode the chunk
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);

          if (data === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'error') {
              onError(new Error(parsed.error.message));
              return;
            }

            onChunk(parsed);
          } catch (err) {
            console.error('Failed to parse chunk:', err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    onError(error);
  }
}

/**
 * Get OpenRouter configuration from backend
 * @returns {Promise<Object>} Configuration data
 */
export async function getConfig() {
  try {
    const response = await fetch(`${API_URL}/api/summary/config`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching config:', error);
    throw new Error('Failed to fetch configuration: ' + error.message);
  }
}
