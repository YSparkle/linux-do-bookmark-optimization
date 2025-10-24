// Linux.do 收藏增强 - 日志工具

const PREFIX = '[ldbe]';
const ENABLED = true; // 可通过设置切换

export const logger = {
  debug(...args) {
    if (ENABLED) console.debug(PREFIX, ...args);
  },
  
  info(...args) {
    if (ENABLED) console.info(PREFIX, ...args);
  },
  
  warn(...args) {
    if (ENABLED) console.warn(PREFIX, ...args);
  },
  
  error(...args) {
    if (ENABLED) console.error(PREFIX, ...args);
  },
};
