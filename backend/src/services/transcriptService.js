import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extract video ID from YouTube URL or return as-is if already an ID
 */
function extractVideoId(videoIdOrUrl) {
  if (!videoIdOrUrl) {
    throw new Error('Video ID or URL is required');
  }

  // If it's already just an ID (11 characters, alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
    return videoIdOrUrl;
  }

  // Extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = videoIdOrUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Invalid YouTube URL or video ID');
}

/**
 * Format milliseconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Fetch transcript for a YouTube video with fallback logic
 * @param {string} videoIdOrUrl - YouTube video ID or URL
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Object>} Transcript data with fullText, transcript array, and duration
 */
export async function getTranscript(videoIdOrUrl, retries = 2) {
  try {
    const videoId = extractVideoId(videoIdOrUrl);
    let transcriptData = null;
    let lastError = null;

    // Try with English language preference first
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // First attempt: Try with English
        if (attempt === 0) {
          transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: 'en'
          });
        }
        // Second attempt: Try without language specification (auto-detect)
        else if (attempt === 1) {
          transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
        }
        // Final attempt: Retry without lang after delay
        else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
        }

        if (transcriptData && transcriptData.length > 0) {
          break; // Success!
        }
      } catch (err) {
        lastError = err;
        console.error(`Attempt ${attempt + 1} failed:`, err.message);
      }
    }

    if (!transcriptData || transcriptData.length === 0) {
      throw lastError || new Error('No transcript data available');
    }

    // Format transcript data
    const formattedTranscript = transcriptData.map(item => ({
      timestamp: formatTimestamp(item.offset),
      seconds: Math.floor(item.offset / 1000),
      text: item.text.trim()
    }));

    // Calculate duration (last item's offset + estimated duration)
    const lastItem = transcriptData[transcriptData.length - 1];
    const duration = lastItem.offset + (lastItem.duration || 0);

    // Create full text by concatenating all transcript items
    const fullText = formattedTranscript.map(item => item.text).join(' ');

    // Detect language (basic detection based on character sets)
    const language = detectLanguage(fullText);

    return {
      videoId,
      transcript: formattedTranscript,
      fullText,
      duration,
      language,
      method: 'youtube-transcript'
    };

  } catch (error) {
    console.error('Transcript fetch error:', error);

    throw {
      type: 'NO_TRANSCRIPT',
      message: 'No transcript available for this video',
      details: error.message,
      tryDomExtraction: false // For web app, we don't have DOM extraction option
    };
  }
}

/**
 * Basic language detection
 */
function detectLanguage(text) {
  // Simple heuristic: check for non-Latin characters
  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasChinese = /[\u4E00-\u9FFF]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const hasKorean = /[\uAC00-\uD7AF]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);

  if (hasHindi) return 'hi';
  if (hasChinese) return 'zh';
  if (hasJapanese) return 'ja';
  if (hasKorean) return 'ko';
  if (hasArabic) return 'ar';

  return 'en'; // Default to English
}
