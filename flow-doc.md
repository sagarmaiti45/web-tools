# YuGPT Chrome Extension - Technical Flow Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Transcript Fetching Flow](#transcript-fetching-flow)
4. [Summary Generation Flow](#summary-generation-flow)
5. [AI Chat Flow](#ai-chat-flow)
6. [Request/Response Formats](#requestresponse-formats)
7. [Key Components](#key-components)

---

## 🎯 Overview

YuGPT is a Chrome extension that summarizes YouTube videos using AI. It fetches video transcripts, processes them (with chunking for long videos), and generates summaries using OpenRouter's AI models.

**Tech Stack:**
- **Frontend**: Chrome Extension (Vanilla JS)
- **Backend**: Node.js + Express (Railway deployment)
- **Transcript Library**: `youtube-transcript` (NPM package)
- **AI Provider**: OpenRouter API (supports multiple models: GPT-4, Claude, Gemini, etc.)

---

## 🏗️ Architecture

```
┌─────────────────────┐
│  Chrome Extension   │
│   (content.js)      │
└──────────┬──────────┘
           │
           │ API Calls
           ▼
┌─────────────────────┐
│  Backend Server     │
│  (Railway/Express)  │
│                     │
│  ┌──────────────┐   │
│  │ Transcript   │   │──► youtube-transcript library
│  │ Service      │   │
│  └──────────────┘   │
│                     │
│  ┌──────────────┐   │
│  │ OpenRouter   │   │──► OpenRouter API
│  │ Service      │   │    (GPT-4/Claude/Gemini)
│  └──────────────┘   │
└─────────────────────┘
```

---

## 📜 Transcript Fetching Flow

### 4-Tier Fallback System

YuGPT uses a sophisticated 4-tier fallback approach to ensure maximum success rate:

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSCRIPT FETCHING                      │
└─────────────────────────────────────────────────────────────┘

1️⃣  TRY: Backend Python API (youtube-transcript-api)
    ├─ Library: youtube-transcript NPM package
    ├─ Speed: FASTEST (~500ms)
    ├─ Success Rate: ~90%
    └─ Limitations: Requires captions to be enabled

         ⬇️  If fails...

2️⃣  TRY: Backend Node.js libraries (youtube-transcript / youtubei.js)
    ├─ Alternative library: youtubei.js
    ├─ Speed: FAST (~1-2s)
    ├─ Success Rate: ~85%
    └─ Limitations: Similar to Tier 1

         ⬇️  If fails...

3️⃣  TRY: Backend Whisper AI (OpenAI's Whisper)
    ├─ Library: openai-whisper
    ├─ Speed: SLOW (1-5 minutes)
    ├─ Success Rate: ~95%
    └─ Works without captions (generates transcript from audio)

         ⬇️  If fails...

4️⃣  FALLBACK: Frontend DOM Extraction
    ├─ Method: Extract from YouTube's transcript panel DOM
    ├─ Speed: FAST (~1s)
    ├─ Success Rate: ~70%
    └─ Limitations: Requires user to have transcript panel open
```

### Transcript Fetching Code Flow

**File**: `/services/apiService.js:11-30`

```javascript
// 1. Extension calls backend
const transcriptData = await apiService.getTranscript(videoId);

// API Request
GET https://yugpt-production.up.railway.app/api/transcript/{videoId}
```

**Backend Processing** (`backend/src/services/transcriptService.js`):

```javascript
import { YoutubeTranscript } from 'youtube-transcript';

export async function getTranscript(videoIdOrUrl, retries = 2) {
  // Extract video ID from URL
  const videoId = extractVideoId(videoIdOrUrl);

  // Try with English language preference
  let transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
    lang: 'en'
  });

  // If English fails, try without language specification
  if (!transcriptData) {
    transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
  }

  // Format: { transcript: [...], fullText: "...", duration: 123 }
  return {
    videoId,
    transcript: formattedTranscript,  // Array of { timestamp, seconds, text }
    fullText,                         // Full text concatenated
    duration                          // Video duration in ms
  };
}
```

### Transcript Response Format

```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "method": "youtube-transcript-api",
    "transcript": [
      {
        "timestamp": "0:00",
        "seconds": 0,
        "text": "Welcome to this video..."
      },
      {
        "timestamp": "0:15",
        "seconds": 15,
        "text": "Today we'll discuss..."
      }
    ],
    "fullText": "Welcome to this video... Today we'll discuss...",
    "duration": 600000,
    "language": "en"
  }
}
```

---

## 🎬 Summary Generation Flow

### Single Chunk (Short Videos)

```
┌────────────────────────────────────────────────────────────┐
│              SINGLE CHUNK FLOW (< 4000 chars)              │
└────────────────────────────────────────────────────────────┘

1. Get Transcript
   └─► Full text: "Welcome to... [4000 chars]"

2. Replace Variables in Preset Prompt
   ├─ {{TITLE}} → "Introduction to React"
   ├─ {{CHANNEL}} → "Tech Academy"
   ├─ {{TRANSCRIPT}} → "[full transcript]"
   ├─ {{DURATION}} → "10:23"
   └─ Result: Complete prompt with context

3. Stream to OpenRouter API
   ├─ Model: google/gemini-flash-1.5 (configurable)
   ├─ Stream: true (real-time streaming)
   ├─ Max Tokens: 4000 (from admin config)
   └─ Temperature: 0.7

4. Display Streaming Response
   └─► User sees summary appear word-by-word
```

### Multiple Chunks (Long Videos)

```
┌────────────────────────────────────────────────────────────┐
│           MULTI-CHUNK FLOW (> 4000 chars)                  │
└────────────────────────────────────────────────────────────┘

Step 1: Chunking
├─ Input: "Full transcript with 15,000 characters"
├─ Chunk Size: 4000 chars per chunk
├─ Algorithm: Split by lines (preserves context)
└─ Output: 4 chunks

   Chunk 1: [0:00 - 2:30]  "Welcome to... [4000 chars]"
   Chunk 2: [2:30 - 5:00]  "Next topic... [4000 chars]"
   Chunk 3: [5:00 - 7:30]  "Moving on... [4000 chars]"
   Chunk 4: [7:30 - 10:00] "Finally... [3000 chars]"

         ⬇️

Step 2: Process Each Chunk Individually
├─ For i = 1 to 4:
│   ├─ Show Progress: "Processing chunk 2 of 4..."
│   ├─ Replace Variables:
│   │   ├─ {{CHUNK_NUMBER}} → "2"
│   │   ├─ {{TOTAL_CHUNKS}} → "4"
│   │   ├─ {{TRANSCRIPT}} → [chunk 2 content]
│   │   └─ {{...other vars...}}
│   │
│   ├─ Send to OpenRouter
│   │   ├─ Stream: true (but don't show to user)
│   │   └─ Collect full response internally
│   │
│   └─ Store: chunkSummaries[1] = "Summary of chunk 2..."
│
└─ Result: 4 individual chunk summaries

         ⬇️

Step 3: Combine All Summaries
├─ Show Progress: "Combining all summaries into final output..."
│
├─ Create Combine Prompt:
│   ```
│   You analyzed this video in 4 parts. Combine these summaries:
│
│   ## Chunk 1 Summary:
│   [summary 1]
│
│   ## Chunk 2 Summary:
│   [summary 2]
│
│   ... etc
│
│   Instructions:
│   - Merge into one cohesive summary
│   - Remove redundancies
│   - Maintain chronological order
│   - Preserve timestamps
│   ```
│
├─ Send to OpenRouter
│   ├─ Stream: true (show to user in real-time)
│   └─ Max Tokens: 4000
│
└─ Display Final Combined Summary
    └─► User sees unified, polished summary
```

### Chunking Algorithm

**File**: `/utils/videoUtils.js:182-209`

```javascript
window.videoUtils.chunkTranscript = function(transcript, chunkSize = 4000) {
  if (transcript.length <= chunkSize) {
    return [transcript];  // Single chunk
  }

  const chunks = [];
  const lines = transcript.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    // If adding this line exceeds chunk size, save current chunk
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
```

### OpenRouter Request Format

**File**: `/services/apiService.js:183-225`

**Streaming Mode (Default)**:
```javascript
// Request Body
{
  "model": "google/gemini-flash-1.5",
  "messages": [
    {
      "role": "system",
      "content": "You are an AI assistant that summarizes video content..."
    },
    {
      "role": "user",
      "content": "Summarize this transcript: [transcript with variables replaced]"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 4000
}

// Response: Server-Sent Events (SSE)
data: {"choices":[{"delta":{"content":"## "}}]}
data: {"choices":[{"delta":{"content":"🎯 "}}]}
data: {"choices":[{"delta":{"content":"Overview"}}]}
data: {"choices":[{"delta":{"content":"\n\nThis"}}]}
...
data: [DONE]
```

**Non-Streaming Mode (Non-English Content)**:
```javascript
// Request Body
{
  "model": "google/gemini-flash-1.5",
  "messages": [...],
  "stream": false,        // ← Disabled for non-English
  "temperature": 0.7,
  "max_tokens": 4000
}

// Response: Complete JSON
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "## 🎯 सारांश\n\nयह वीडियो..."  // Full response
      }
    }
  ]
}
```

### Prompt Variable Replacement

**File**: `/utils/videoUtils.js:163-174`

```javascript
window.videoUtils.replaceVariables = function(template, variables) {
  let result = template;

  // Available variables:
  // - {{TITLE}} → "Video Title"
  // - {{CHANNEL}} → "Channel Name"
  // - {{URL}} → "https://youtube.com/watch?v=..."
  // - {{TRANSCRIPT}} → "[full or chunk transcript]"
  // - {{DURATION}} → "10:23"
  // - {{CHUNK_NUMBER}} → "2" (for multi-chunk)
  // - {{TOTAL_CHUNKS}} → "4" (for multi-chunk)

  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), variables[key]);
  });

  return result;
}
```

### System Prompts

**Summarization System Prompt** (`apiService.js:194`):
```
You are an AI assistant that summarizes video content. Use the video title
and channel for CONTENT understanding only (what the video is about), NOT for
language detection. ALWAYS write your entire summary in the exact SAME LANGUAGE
as the transcript text.

Formatting:
- Use ## for section headings with emojis (## 🎯 Overview)
- Use **bold** for key terms only
- Place timestamps at end of sentences: [🔗 0:03]
- Keep it clear and structured
```

**Chunk Combining Prompt** (`videoUtils.js:223-242`):
```
You previously analyzed a long video in 4 parts. Now combine these chunk
summaries into one coherent, comprehensive final summary.

Video: [title]
Channel: [channel]
Duration: [duration]

Individual Chunk Summaries:
## Chunk 1 Summary:
[summary 1]

## Chunk 2 Summary:
[summary 2]
...

Instructions:
1. Merge all chunk summaries into one cohesive summary
2. Remove redundancies and consolidate overlapping information
3. Maintain chronological order where applicable
4. Preserve all important details, timestamps, and insights
5. Follow the original format style: [preset name]
6. Ensure the final output is well-structured and comprehensive
7. Do NOT add introduction like "Here's the combined summary" - start directly
```

---

## 💬 AI Chat Flow

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      AI CHAT FLOW                          │
└────────────────────────────────────────────────────────────┘

1. User Generates Summary
   └─► Summary stored as context: currentSummaryContext

2. User Clicks "AI Chat" Button
   ├─ Opens chat interface
   ├─ Initializes chat history: chatHistory = []
   └─ Shows preset message buttons

3. User Sends Message
   ├─ Input: "What are the key points?"
   └─ Trigger: sendChatMessage(message)

4. Build Chat Request
   ├─ System Prompt:
   │   └─► "You are helping users understand this video.
   │        Here's the summary: [currentSummaryContext]
   │        Only answer questions about this video."
   │
   ├─ Chat History (last 10 messages):
   │   ├─ {role: "user", content: "What is this video about?"}
   │   ├─ {role: "assistant", content: "This video explains..."}
   │   └─ ... (up to 10 messages)
   │
   └─ Current Message:
       └─ {role: "user", content: "What are the key points?"}

5. Stream Response from OpenRouter
   ├─ Model: google/gemini-flash-1.5
   ├─ Stream: true (real-time)
   ├─ Max Tokens: 500 (shorter for chat)
   └─ Temperature: 0.7

6. Display Streaming Response
   └─► User sees AI response appear word-by-word

7. Update Chat History
   ├─ chatHistory.push({role: "user", content: "..."})
   └─ chatHistory.push({role: "assistant", content: "..."})

8. User Can Continue Conversation
   └─► Context maintained via chat history
```

### Chat System Prompt

**File**: `/services/apiService.js:358-382`

```javascript
{
  role: 'system',
  content: `You are an AI assistant helping users understand a YouTube video.
  You have access to the video's summary below.

CRITICAL INSTRUCTIONS:
1. ONLY answer questions related to this specific video and its content
2. If the user asks about topics unrelated to the video, politely decline
3. Base your answers on the summary provided
4. Keep responses SHORT and CONCISE (2-4 sentences max, or 3-5 bullet points max)
5. If the summary doesn't contain enough information, say so honestly
6. Use simple, clean formatting - AVOID excessive markdown

FORMATTING RULES:
- Use **bold** only for key terms
- Use bullet points (-) for lists, but keep them SHORT (max 5 items)
- NO nested lists or complex formatting
- NO long paragraphs - break into 2-3 sentence chunks
- Keep it conversational and easy to read

VIDEO SUMMARY:
${summaryContext}

GUIDELINES:
- If asked "What is this video about?" - Provide brief 2-3 sentence overview
- If asked off-topic - Respond: "I'm here to help you understand this video.
  Please ask questions related to the video content."
- Focus on being HELPFUL and BRIEF - don't over-explain`
}
```

### Chat Request Format

**File**: `/services/apiService.js:347-413`

```javascript
// API Call
apiService.streamChatMessage(userMessage, summaryContext, chatHistory);

// Request Body
{
  "model": "google/gemini-flash-1.5",
  "messages": [
    {
      "role": "system",
      "content": "[System prompt with video summary]"
    },
    // Last 10 messages from chat history
    {
      "role": "user",
      "content": "What is this video about?"
    },
    {
      "role": "assistant",
      "content": "This video explains React hooks..."
    },
    // Current message
    {
      "role": "user",
      "content": "Can you explain useState?"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 500  // Reduced for shorter chat responses
}
```

### Chat History Management

```javascript
// Initialize empty on chat open
chatHistory = [];

// After each exchange
chatHistory.push({
  role: 'user',
  content: userMessage
});

chatHistory.push({
  role: 'assistant',
  content: aiResponse
});

// Keep only last 10 messages (5 exchanges)
const recentHistory = chatHistory.slice(-10);
```

---

## 📤 Request/Response Formats

### 1. Get Transcript

**Request:**
```http
GET /api/transcript/{videoId}
Host: yugpt-production.up.railway.app
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "method": "youtube-transcript-api",
    "transcript": [
      {
        "timestamp": "0:00",
        "seconds": 0,
        "text": "Welcome to this video"
      }
    ],
    "fullText": "Welcome to this video...",
    "duration": 600000,
    "language": "en"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "type": "NO_TRANSCRIPT",
    "message": "No transcript available via backend",
    "details": "YouTube API returned: Transcript is disabled",
    "tryDomExtraction": true
  }
}
```

### 2. Get OpenRouter Config

**Request:**
```http
GET /api/summary/config
Host: yugpt-production.up.railway.app
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiUrl": "https://openrouter.ai/api/v1/chat/completions",
    "apiKey": "sk-or-v1-...",
    "model": "google/gemini-flash-1.5",
    "siteUrl": "https://yugpt.app",
    "siteName": "YuGPT",
    "presetMaxTokens": {
      "default": 4000,
      "presets": {
        "general-summary": 4000,
        "extract-quotes": 3000,
        "code-commands": 5000
      }
    }
  }
}
```

### 3. OpenRouter Streaming Response (SSE)

**Response Format:**
```
data: {"id":"gen-1234","choices":[{"delta":{"content":"## "}}]}

data: {"id":"gen-1234","choices":[{"delta":{"content":"🎯 "}}]}

data: {"id":"gen-1234","choices":[{"delta":{"content":"Overview"}}]}

data: {"id":"gen-1234","choices":[{"delta":{"content":"\n\n"}}]}

data: {"id":"gen-1234","choices":[{"delta":{"content":"This video"}}]}

data: [DONE]
```

**Parsing Logic** (`apiService.js:270-302`):
```javascript
// Read stream line by line
while (true) {
  const line = buffer.slice(0, lineEnd).trim();

  if (line.startsWith('data: ')) {
    const data = line.slice(6);

    if (data === '[DONE]') {
      yield { type: 'done' };
      return;
    }

    const parsed = JSON.parse(data);
    const content = parsed.choices?.[0]?.delta?.content;

    if (content) {
      yield { type: 'content', content: content };
    }
  }
}
```

### 4. Summary Generation Events

**Event Types:**

```javascript
// 1. Metadata (Initial)
{
  type: 'metadata',
  preset: {
    id: 'general-summary',
    name: 'General Summary',
    description: 'Comprehensive overview'
  },
  videoId: 'dQw4w9WgXcQ',
  totalChunks: 4
}

// 2. Progress (Multi-chunk)
{
  type: 'progress',
  current: 2,
  total: 4,
  message: 'Processing chunk 2 of 4...'
}

// 3. Combining Start (Multi-chunk)
{
  type: 'combining_start',
  chunkSummaries: [
    "Summary of chunk 1...",
    "Summary of chunk 2...",
    "Summary of chunk 3...",
    "Summary of chunk 4..."
  ],
  metadata: {
    title: "Video Title",
    channel: "Channel Name",
    duration: "10:23"
  }
}

// 4. Content (Streaming)
{
  type: 'content',
  content: "## 🎯 Overview\n\nThis video"
}

// 5. Done (End)
{
  type: 'done'
}
```

---

## 🔧 Key Components

### Frontend (Chrome Extension)

**File: `/services/apiService.js`**
- `getTranscript(videoId)` - Fetch transcript from backend
- `getOpenRouterConfig()` - Get OpenRouter configuration
- `streamSummaryWithChunking()` - Main summarization orchestrator
- `streamToOpenRouter()` - Stream individual prompts to AI
- `streamChatMessage()` - Handle chat interactions
- `translateSummary()` - Translate summaries to other languages

**File: `/utils/videoUtils.js`**
- `extractVideoMetadata()` - Get video title, channel, duration from DOM
- `chunkTranscript()` - Split long transcripts into chunks
- `replaceVariables()` - Replace {{VARIABLES}} in prompts
- `createCombinePrompt()` - Generate chunk combining prompt

**File: `/content.js`**
- `getTranscriptWithFallback()` - 4-tier transcript fetching
- `startSummarization()` - Initiate summary generation
- `openAIChat()` - Open and manage chat interface
- `sendChatMessage()` - Send chat messages to AI

### Backend (Node.js/Express)

**File: `/backend/src/services/transcriptService.js`**
- `getTranscript()` - Fetch transcript using youtube-transcript library
- `extractVideoId()` - Parse video ID from URL
- `formatTimestamp()` - Convert milliseconds to MM:SS

**File: `/backend/src/services/openRouterService.js`**
- `streamSummary()` - Stream summary from OpenRouter
- `parseSSEStream()` - Parse Server-Sent Events stream

**File: `/backend/src/config/summaryPresets.js`**
- Preset templates (13 presets)
- Each preset has: id, name, description, category, prompt

### Libraries Used

1. **youtube-transcript** (NPM)
   - Version: Latest
   - Purpose: Fetch YouTube transcripts
   - Fallback: English → Any language
   - Retry logic: 2 attempts with 1s delay

2. **OpenRouter API**
   - Endpoint: https://openrouter.ai/api/v1/chat/completions
   - Models: GPT-4, Claude, Gemini, etc. (configurable)
   - Streaming: SSE (Server-Sent Events)
   - Authentication: Bearer token

---

## 🎯 Summary

**Transcript Flow:**
1. Frontend requests transcript from backend
2. Backend uses `youtube-transcript` library (4-tier fallback)
3. Returns formatted transcript with timestamps

**Summary Flow (Short Video):**
1. Get transcript (single chunk)
2. Replace variables in preset prompt
3. Stream to OpenRouter API
4. Display streaming response

**Summary Flow (Long Video):**
1. Get transcript → Chunk into 4000-char pieces
2. Process each chunk individually (collect summaries)
3. Combine all chunk summaries into final output
4. Stream combined summary to user

**Chat Flow:**
1. Use generated summary as context
2. Maintain chat history (last 10 messages)
3. Stream AI responses in real-time
4. Keep conversations focused on video content

**Key Technologies:**
- Library: `youtube-transcript` (Node.js)
- AI Provider: OpenRouter (multi-model support)
- Streaming: Server-Sent Events (SSE)
- Chunking: 4000 characters per chunk
- Max Tokens: Configurable per preset (admin panel)

---

## 📝 Notes

- **Language Detection**: Auto-detected from transcript
- **Non-English Content**: Uses non-streaming mode (fixes Gemini bug)
- **Retry Logic**: 2 retries for transcript fetching
- **Rate Limiting**: Handled by OpenRouter
- **Error Handling**: Comprehensive with fallback mechanisms
- **Admin Configuration**: Model, max tokens, prompts all configurable
