// Linux.do 收藏增强 - API 请求、重试与节流

import { ERR } from './types.js';

/**
 * 带超时和重试的 fetch 封装
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @param {number} retries
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, timeoutMs = 20000, retries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 对于 429 和 5xx 错误进行重试
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          await backoff(attempt);
          continue;
        }
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // 网络错误或超时，进行重试
      if (attempt < retries) {
        await backoff(attempt);
        continue;
      }
    }
  }
  
  throw lastError;
}

/**
 * 指数退避延迟
 * @param {number} attempt
 * @returns {Promise<void>}
 */
function backoff(attempt) {
  const baseDelay = 1000;
  const maxDelay = 10000;
  const jitter = Math.random() * 500;
  const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * AI 分类请求
 * @param {Object} settings
 * @param {string[]} candidateTags
 * @param {Object} post
 * @returns {Promise<string[]>}
 */
export async function callAIClassify(settings, candidateTags, post) {
  const { apiBase, apiKey, model, timeoutMs = 20000, bodyCharLimit = 8000 } = settings;
  
  if (!apiBase || !apiKey || !model) {
    throw new Error(ERR.NOT_CONFIGURED);
  }
  
  // 构建请求体
  const postBody = truncateText(post.body || '', bodyCharLimit);
  const input = {
    candidate_tags: candidateTags,
    post_title: post.title,
    post_body: postBody,
    notes: {
      native_tags: post.nativeTags || [],
      language: detectLanguage(post.title),
    },
  };
  
  const systemPrompt = `你是严格的标签分类器。禁止创造新标签，只能从候选池中选择 0 到多个标签。
仅输出严格 JSON 数组格式，例如 ["技术教程","Docker"]，不要包含任何解释文本。`;

  const userPrompt = JSON.stringify(input, null, 2);
  
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
  };
  
  // 发起请求（带重试）
  let response;
  try {
    response = await fetchWithRetry(
      `${apiBase.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      timeoutMs,
      1 // AI 请求只重试一次
    );
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(ERR.TIMEOUT);
    }
    throw new Error(ERR.HTTP);
  }
  
  if (!response.ok) {
    throw new Error(`${ERR.HTTP}: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  
  // 解析 AI 返回的标签数组
  return parseAIResponse(content, candidateTags);
}

/**
 * 解析 AI 响应，提取标签数组
 * @param {string} content
 * @param {string[]} candidateTags
 * @returns {string[]}
 */
function parseAIResponse(content, candidateTags) {
  let text = content.trim();
  
  // 剥离可能的代码围栏
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }
  
  // 尝试解析 JSON
  try {
    const parsed = JSON.parse(text);
    
    // 如果是对象且有 tags 字段
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tags)) {
      return filterValidTags(parsed.tags, candidateTags);
    }
    
    // 如果是数组
    if (Array.isArray(parsed)) {
      return filterValidTags(parsed, candidateTags);
    }
  } catch (error) {
    throw new Error(ERR.BAD_JSON);
  }
  
  throw new Error(ERR.BAD_JSON);
}

/**
 * 过滤出有效的候选标签
 * @param {any[]} tags
 * @param {string[]} candidateTags
 * @returns {string[]}
 */
function filterValidTags(tags, candidateTags) {
  const candidateSet = new Set(candidateTags);
  return tags
    .filter(t => typeof t === 'string')
    .map(t => t.trim())
    .filter(t => candidateSet.has(t));
}

/**
 * 截断文本到指定长度
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 简单语言检测
 * @param {string} text
 * @returns {string}
 */
function detectLanguage(text) {
  if (!text) return 'zh';
  // 简单检测：如果包含中文字符，认为是中文
  return /[\u4e00-\u9fa5]/.test(text) ? 'zh' : 'en';
}

/**
 * 信号量/并发控制类
 */
export class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }
  
  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }
  
  release() {
    this.current--;
    if (this.queue.length > 0) {
      this.current++;
      const resolve = this.queue.shift();
      resolve();
    }
  }
  
  async run(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
