// ============================================
// LOGGER SERVICE
// ============================================

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5
}

export interface ILogger {
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  verbose(...args: any[]): void;
}

class ConsoleLogger implements ILogger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  verbose(...args: any[]): void {
    if (this.level >= LogLevel.VERBOSE) {
      console.debug('[VERBOSE]', ...args);
    }
  }
}

// ===== SINGLETON =====
export const logger = new ConsoleLogger();

// ===== HELPER =====
export function setLogLevel(level: LogLevel): void {
  logger.setLevel(level);
}