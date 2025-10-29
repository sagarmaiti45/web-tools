'use client';

export default function SummaryDisplay({ summary, loading, videoMetadata }) {
  if (!summary && !loading) {
    return null;
  }

  return (
    <div style={styles.container}>
      {videoMetadata && (
        <div style={styles.metadata}>
          <h2 style={styles.videoTitle}>{videoMetadata.title}</h2>
          {videoMetadata.channel && (
            <p style={styles.channel}>Channel: {videoMetadata.channel}</p>
          )}
        </div>
      )}

      <div style={styles.summaryContainer}>
        <h3 style={styles.heading}>Summary</h3>
        {loading && !summary && (
          <div style={styles.loader}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Generating summary...</p>
          </div>
        )}

        {summary && (
          <div style={styles.content}>
            <pre style={styles.summaryText}>{summary}</pre>
          </div>
        )}

        {loading && summary && (
          <div style={styles.streamingIndicator}>
            <span style={styles.dot}></span>
            <span style={styles.streamingText}>Streaming...</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '2rem',
  },
  metadata: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    marginBottom: '1rem',
  },
  videoTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0 0 0.5rem 0',
  },
  channel: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.95rem',
  },
  summaryContainer: {
    backgroundColor: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    minHeight: '300px',
  },
  heading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 0,
    marginBottom: '1.5rem',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #334155',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
  content: {
    color: '#e2e8f0',
    lineHeight: '1.8',
  },
  summaryText: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '1rem',
    margin: 0,
    color: '#e2e8f0',
  },
  streamingIndicator: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  dot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#667eea',
    borderRadius: '50%',
    marginRight: '0.5rem',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  streamingText: {
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(styleSheet);
}
