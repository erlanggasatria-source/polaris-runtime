// ============================================
// DEVELOPMENT ENTRY POINT
// ============================================

import { PolarisRuntime as BaseRuntime } from './core/runtime';
import { logger, LogLevel } from './core/logger';

// ===== SET LOG LEVEL =====
logger.setLevel(LogLevel.VERBOSE);

// ===== RE-EXPORT =====
export * from './index';

// ===== OVERRIDE: PolarisRuntime dengan DEV MODE =====
export class PolarisRuntime extends BaseRuntime {
  constructor() {
    super({ dev: true }); // ← otomatis dev = true!
  }
}

export { logger, LogLevel };