'use client';

import { useState } from 'react';
import VideoInput from '../components/VideoInput';
import SummaryDisplay from '../components/SummaryDisplay';

export default function Home() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  const handleSummaryGenerated = (summaryData) => {
    setSummary(summaryData);
    setLoading(false);
  };

  const handleStartLoading = () => {
    setLoading(true);
    setSummary('');
    setProgress(null);
  };

  const handleProgress = (progressData) => {
    setProgress(progressData);
  };

  const handleMetadata = (metadata) => {
    setVideoMetadata(metadata);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>YouTube Video Summarizer</h1>
        <p style={styles.subtitle}>
          AI-powered video summaries using OpenRouter
        </p>
      </header>

      <main style={styles.main}>
        <VideoInput
          onSummaryGenerated={handleSummaryGenerated}
          onStartLoading={handleStartLoading}
          onProgress={handleProgress}
          onMetadata={handleMetadata}
        />

        {progress && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
            <p style={styles.progressText}>{progress.message}</p>
          </div>
        )}

        <SummaryDisplay
          summary={summary}
          loading={loading}
          videoMetadata={videoMetadata}
        />
      </main>

      <footer style={styles.footer}>
        <p>Powered by OpenRouter AI • Built with Next.js & Node.js</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
  },
  header: {
    textAlign: 'center',
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0 0 0.5rem 0',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '1.1rem',
    margin: 0,
    color: '#e0e7ff',
    opacity: 0.9,
  },
  main: {
    flex: 1,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  progressContainer: {
    margin: '2rem 0',
    padding: '1.5rem',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#334155',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    transition: 'width 0.3s ease',
  },
  progressText: {
    textAlign: 'center',
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.95rem',
  },
  footer: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#1e293b',
    borderTop: '1px solid #334155',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
};
