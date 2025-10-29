'use client';

import { useState } from 'react';
import { fetchTranscript, generateSummary } from '../lib/api';

export default function VideoInput({ onSummaryGenerated, onStartLoading, onProgress, onMetadata }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    // Check if it's already just a video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
      setError('Please enter a valid YouTube URL or video ID');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a video title');
      return;
    }

    setIsLoading(true);
    onStartLoading();

    try {
      // Step 1: Fetch transcript
      console.log('Fetching transcript for:', videoId);
      const transcriptData = await fetchTranscript(videoId);

      if (!transcriptData.success) {
        throw new Error(transcriptData.error?.message || 'Failed to fetch transcript');
      }

      console.log('Transcript fetched successfully');

      // Step 2: Set metadata
      const metadata = {
        title: title.trim(),
        channel: channel.trim() || 'Unknown Channel',
        videoId,
        duration: transcriptData.data.duration,
        language: transcriptData.data.language,
      };

      onMetadata(metadata);

      // Step 3: Generate summary with streaming
      let fullSummary = '';

      await generateSummary(
        transcriptData.data,
        metadata,
        // On chunk received
        (chunk) => {
          if (chunk.type === 'content') {
            fullSummary += chunk.content;
            onSummaryGenerated(fullSummary);
          } else if (chunk.type === 'progress') {
            onProgress(chunk);
          } else if (chunk.type === 'metadata') {
            console.log('Summary metadata:', chunk);
          } else if (chunk.type === 'combining_start') {
            onProgress({
              current: chunk.chunkSummaries.length,
              total: chunk.chunkSummaries.length,
              message: 'Combining all summaries into final output...',
            });
          }
        },
        // On complete
        () => {
          console.log('Summary generation completed');
          setIsLoading(false);
        },
        // On error
        (error) => {
          console.error('Summary generation error:', error);
          setError(error.message || 'Failed to generate summary');
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>YouTube URL or Video ID</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            style={styles.input}
            disabled={isLoading}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Video Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            style={styles.input}
            disabled={isLoading}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Channel Name (Optional)</label>
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Enter channel name"
            style={styles.input}
            disabled={isLoading}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={isLoading} style={styles.button}>
          {isLoading ? 'Processing...' : 'Generate Summary'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    marginBottom: '2rem',
  },
  form: {
    backgroundColor: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  inputGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#cbd5e1',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  error: {
    padding: '0.75rem',
    marginBottom: '1rem',
    backgroundColor: '#991b1b',
    color: '#fecaca',
    borderRadius: '8px',
    fontSize: '0.9rem',
  },
};
