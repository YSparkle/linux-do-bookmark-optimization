// Linux.do 收藏增强 - AI 分类调度与批处理

import { callAIClassify, Semaphore } from './api.js';
import { getOne, putOne, getAll } from './idb.js';
import { TAG_TYPE } from './types.js';

/**
 * 批量分类帖子
 * @param {Object[]} posts
 * @param {Object} settings
 * @param {Function} onProgress
 * @returns {Promise<Object[]>}
 */
export async function classifyBatch(posts, settings, onProgress) {
  const { aiConcurrency = 2, batchLimit = 100, dailyBudget = 1000 } = settings;
  
  // 获取候选标签
  const candidateTags = await getCandidateTags(settings);
  if (candidateTags.length === 0) {
    throw new Error('No candidate tags available');
  }
  
  // 过滤出需要分类的帖子（未分类或未锁定的）
  const toClassify = [];
  for (const post of posts) {
    const classify = await getOne('classifies', post.id);
    if (!classify || !classify.locked) {
      toClassify.push(post);
    }
  }
  
  // 限制批次大小
  const limited = toClassify.slice(0, Math.min(batchLimit, dailyBudget));
  
  if (limited.length === 0) {
    return [];
  }
  
  // 并发控制
  const semaphore = new Semaphore(aiConcurrency);
  const results = [];
  let processed = 0;
  
  const tasks = limited.map(post => async () => {
    try {
      const tags = await semaphore.run(() => 
        callAIClassify(settings, candidateTags, post)
      );
      
      const modelSignature = `${settings.apiBase}:${settings.model}:v1`;
      const classify = {
        postId: post.id,
        aiTags: tags,
        userTags: [],
        locked: false,
        modelSignature,
        ts: Date.now(),
      };
      
      // 如果已有分类记录，保留用户标签
      const existing = await getOne('classifies', post.id);
      if (existing && Array.isArray(existing.userTags)) {
        classify.userTags = existing.userTags;
      }
      if (existing && existing.locked) {
        classify.locked = true;
        classify.aiTags = existing.aiTags || [];
      }
      
      await putOne('classifies', classify);
      
      results.push({
        postId: post.id,
        tags,
        success: true,
      });
    } catch (error) {
      console.error(`[classify] Failed for post ${post.id}:`, error);
      results.push({
        postId: post.id,
        error: error.message,
        success: false,
      });
    } finally {
      processed++;
      if (onProgress) {
        onProgress({
          phase: 'classify',
          current: processed,
          total: limited.length,
        });
      }
    }
  });
  
  // 并发执行
  await Promise.all(tasks.map(task => task()));
  
  return results;
}

/**
 * 获取候选标签列表
 * @param {Object} settings
 * @returns {Promise<string[]>}
 */
async function getCandidateTags(settings) {
  const allTags = await getAll('tags');
  const enabled = allTags.filter(t => t.enabled !== false);
  
  // 根据设置决定是否包含预制标签
  const types = [TAG_TYPE.USER];
  if (settings.enablePresetTags !== false) {
    types.push(TAG_TYPE.PRESET);
  }
  
  const candidates = enabled
    .filter(t => types.includes(t.type))
    .map(t => t.name);
  
  return [...new Set(candidates)];
}

/**
 * 更新帖子标签（手动编辑）
 * @param {string} postId
 * @param {string[]} userTags
 * @returns {Promise<void>}
 */
export async function updatePostTags(postId, userTags) {
  let classify = await getOne('classifies', postId);
  
  if (!classify) {
    classify = {
      postId,
      aiTags: [],
      userTags: [],
      locked: false,
      modelSignature: '',
      ts: Date.now(),
    };
  }
  
  classify.userTags = userTags;
  classify.locked = true; // 手动编辑后锁定
  classify.ts = Date.now();
  
  await putOne('classifies', classify);
}

/**
 * 获取帖子的所有标签（合并 AI、用户、原生标签）
 * @param {Object} post
 * @returns {Promise<Object>}
 */
export async function getPostAllTags(post) {
  const classify = await getOne('classifies', post.id);
  
  return {
    nativeTags: post.nativeTags || [],
    aiTags: classify?.aiTags || [],
    userTags: classify?.userTags || [],
    locked: classify?.locked || false,
  };
}
