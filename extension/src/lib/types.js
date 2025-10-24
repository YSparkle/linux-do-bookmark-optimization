// Linux.do 收藏增强 - 类型定义与常量

// 消息类型
export const MSG = {
  // Content → SW
  TOGGLE_PANEL: 'TOGGLE_PANEL',
  FETCH_BOOKMARKS: 'FETCH_BOOKMARKS',
  FETCH_TOPIC_DETAIL: 'FETCH_TOPIC_DETAIL',
  CLASSIFY_BATCH: 'CLASSIFY_BATCH',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  GET_SETTINGS: 'GET_SETTINGS',
  EXPORT_JSON: 'EXPORT_JSON',
  IMPORT_JSON: 'IMPORT_JSON',
  LIST_TAGS: 'LIST_TAGS',
  UPSERT_TAG: 'UPSERT_TAG',
  DELETE_TAG: 'DELETE_TAG',
  UPDATE_POST_TAGS: 'UPDATE_POST_TAGS',
  
  // SW → Content
  PROGRESS: 'PROGRESS',
  CLASSIFY_RESULT: 'CLASSIFY_RESULT',
  ERROR: 'ERROR',
  DATA_UPDATED: 'DATA_UPDATED',
};

// 错误码
export const ERR = {
  BAD_JSON: 'E_BAD_JSON',
  TIMEOUT: 'E_TIMEOUT',
  HTTP: 'E_HTTP',
  PARSE: 'E_PARSE',
  PERMISSION: 'E_PERMISSION',
  NOT_CONFIGURED: 'E_NOT_CONFIGURED',
};

// 标签类型
export const TAG_TYPE = {
  PRESET: 'preset',
  USER: 'user',
  NATIVE: 'native',
};

// 预制标签（可在设置中禁用）
export const PRESET_TAGS = [
  '技术教程',
  '环境搭建',
  '故障排查',
  '性能优化',
  '安全实践',
  '网络配置',
  '容器/Docker',
  '虚拟化/KVM',
  '硬件讨论',
  '软件推荐',
  '发行版/包管理',
  'Shell/脚本',
  '系统服务',
  '存储/备份',
  '监控/日志',
  'DevOps/CICD',
  '云/边缘',
  '数据库',
  '中间件',
  'Nginx/HTTP',
  '内核/驱动',
  '桌面/美化',
  '问答/求助',
  '经验分享',
  '公告/活动',
];

// 默认配置
export const DEFAULT_SETTINGS = {
  apiBase: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  aiConcurrency: 2,
  fetchConcurrency: 4,
  timeoutMs: 20000,
  retryMax: 3,
  bodyCharLimit: 8000,
  enableKeywordClusters: false,
  dailyBudget: 1000,
  batchLimit: 100,
  enablePresetTags: true,
};

// 数据模型示例
/**
 * @typedef {Object} Post
 * @property {string} id - topicId#postNumber
 * @property {string} title
 * @property {string} author
 * @property {string} url
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} favoriteAt
 * @property {string[]} nativeTags
 * @property {string} body
 * @property {string} hash
 */

/**
 * @typedef {Object} Classify
 * @property {string} postId
 * @property {string[]} aiTags
 * @property {string[]} userTags
 * @property {boolean} locked
 * @property {string} modelSignature
 * @property {number} ts
 */

/**
 * @typedef {Object} Tag
 * @property {string} name
 * @property {string} type - 'preset' | 'user' | 'native'
 * @property {boolean} enabled
 * @property {number} [weight]
 */

/**
 * @typedef {Object} Settings
 * @property {string} apiBase
 * @property {string} apiKey
 * @property {string} model
 * @property {number} aiConcurrency
 * @property {number} fetchConcurrency
 * @property {number} timeoutMs
 * @property {number} retryMax
 * @property {number} bodyCharLimit
 * @property {boolean} enableKeywordClusters
 * @property {number} dailyBudget
 * @property {number} batchLimit
 * @property {boolean} enablePresetTags
 */
