import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Get OpenRouter configuration
 */
export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured in environment variables');
  }

  return {
    apiUrl: OPENROUTER_API_URL,
    apiKey,
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    siteName: process.env.SITE_NAME || 'YouTube Summarizer',
    maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7')
  };
}

/**
 * Stream response from OpenRouter API
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options (model, maxTokens, etc.)
 * @returns {AsyncGenerator} Async generator that yields chunks of response
 */
export async function* streamFromOpenRouter(messages, options = {}) {
  const config = getOpenRouterConfig();

  const requestBody = {
    model: options.model || config.model,
    messages: messages,
    stream: true,
    temperature: options.temperature || config.temperature,
    max_tokens: options.maxTokens || config.maxTokens
  };

  try {
    const response = await axios.post(config.apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': config.siteUrl,
        'X-Title': config.siteName,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    let buffer = '';

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);

          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              yield { type: 'content', content };
            }
          } catch (err) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }
  } catch (error) {
    console.error('OpenRouter streaming error:', error.response?.data || error.message);
    throw new Error('Failed to stream from OpenRouter: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * Non-streaming request to OpenRouter (for internal chunk processing)
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Complete response text
 */
export async function requestFromOpenRouter(messages, options = {}) {
  const config = getOpenRouterConfig();

  const requestBody = {
    model: options.model || config.model,
    messages: messages,
    stream: false,
    temperature: options.temperature || config.temperature,
    max_tokens: options.maxTokens || config.maxTokens
  };

  try {
    const response = await axios.post(config.apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': config.siteUrl,
        'X-Title': config.siteName,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenRouter request error:', error.response?.data || error.message);
    throw new Error('Failed to get response from OpenRouter: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * Get system prompt for video summarization
 */
export function getSystemPrompt() {
  return `You are an AI assistant that summarizes video content. Use the video title and channel for CONTENT understanding only (what the video is about), NOT for language detection. ALWAYS write your entire summary in the exact SAME LANGUAGE as the transcript text.

Formatting:
- Use ## for section headings with emojis (## 🎯 Overview)
- Use **bold** for key terms only
- Place timestamps at end of sentences: [🔗 0:03]
- Keep it clear and structured`;
}

/**
 * Replace variables in prompt template
 */
export function replaceVariables(template, variables) {
  let result = template;

  Object.keys(variables).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, variables[key]);
  });

  return result;
}
