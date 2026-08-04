import { PolarisRuntime as BaseRuntime } from './core/runtime';
import { logger, LogLevel } from './core/logger';

logger.setLevel(LogLevel.VERBOSE);

export * from './index';

export class PolarisRuntime extends BaseRuntime {
  constructor() {
    super({ dev: true });
  }
}

export { logger, LogLevel };