/**
 * Logger utility for delivery estimate API
 * Provides structured logging with different levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

class Logger {
  constructor() {
    this.context = 'delivery-estimate-api';
  }

  formatMessage(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      file: '[app/api/delivery-estimate/logger.js]',
      message,
      ...metadata,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  log(level, message, metadata = {}) {
    if (LOG_LEVELS[level.toUpperCase()] <= currentLogLevel) {
      const logEntry = this.formatMessage(level, message, metadata);
      
      if (level === 'ERROR') {
        console.error(JSON.stringify(logEntry, null, 2));
      } else if (level === 'WARN') {
        console.warn(JSON.stringify(logEntry, null, 2));
      } else {
        console.log(JSON.stringify(logEntry, null, 2));
      }
    }
  }

  error(message, metadata = {}) {
    this.log('ERROR', message, metadata);
  }

  warn(message, metadata = {}) {
    this.log('WARN', message, metadata);
  }

  info(message, metadata = {}) {
    this.log('INFO', message, metadata);
  }

  debug(message, metadata = {}) {
    this.log('DEBUG', message, metadata);
  }
}

export const logger = new Logger();