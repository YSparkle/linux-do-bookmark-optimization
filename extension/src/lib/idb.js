// Linux.do 收藏增强 - IndexedDB 封装

const DB_NAME = 'linuxdo-bookmarks';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * 初始化并打开 IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export async function openDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // posts store
      if (!db.objectStoreNames.contains('posts')) {
        const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
        postsStore.createIndex('by_fav', 'favoriteAt', { unique: false });
        postsStore.createIndex('by_upd', 'updatedAt', { unique: false });
        postsStore.createIndex('by_author', 'author', { unique: false });
        postsStore.createIndex('by_tag', 'allTags', { unique: false, multiEntry: true });
      }

      // classifies store
      if (!db.objectStoreNames.contains('classifies')) {
        const classStore = db.createObjectStore('classifies', { keyPath: 'postId' });
        classStore.createIndex('by_locked', 'locked', { unique: false });
        classStore.createIndex('by_ts', 'ts', { unique: false });
      }

      // tags store
      if (!db.objectStoreNames.contains('tags')) {
        const tagsStore = db.createObjectStore('tags', { keyPath: 'name' });
        tagsStore.createIndex('by_type', 'type', { unique: false });
        tagsStore.createIndex('by_enabled', 'enabled', { unique: false });
      }

      // settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // index_meta store
      if (!db.objectStoreNames.contains('index_meta')) {
        db.createObjectStore('index_meta', { keyPath: 'key' });
      }
    };
  });
}

/**
 * 通用读取单条记录
 * @param {string} storeName
 * @param {string|number} key
 * @returns {Promise<any>}
 */
export async function getOne(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 通用写入单条记录
 * @param {string} storeName
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function putOne(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 通用删除单条记录
 * @param {string} storeName
 * @param {string|number} key
 * @returns {Promise<void>}
 */
export async function deleteOne(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 获取 store 中所有记录
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 批量写入记录
 * @param {string} storeName
 * @param {any[]} items
 * @returns {Promise<void>}
 */
export async function putMany(storeName, items) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 通过索引查询
 * @param {string} storeName
 * @param {string} indexName
 * @param {any} query
 * @returns {Promise<any[]>}
 */
export async function getAllByIndex(storeName, indexName, query) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const req = index.getAll(query);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 清空指定 store
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 清空所有数据
 * @returns {Promise<void>}
 */
export async function clearAll() {
  const db = await openDB();
  const stores = ['posts', 'classifies', 'tags', 'settings', 'index_meta'];
  return Promise.all(stores.map(s => clearStore(s)));
}
