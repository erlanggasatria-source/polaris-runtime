// ===== PRODUCTION - SILENT =====
export { PolarisRuntime } from './core/runtime';
export { logger, LogLevel } from './core/logger';

// Export everything with default (silent)
export * from './core/types';
export * from './core/runtime';
export * from './plugins/workspace-plugin';
export * from './plugins/repo-plugin';
export * from './plugins/meeting-plugin';
export { generateCatalog, generateExplorerHTML } from './explorer/generator';