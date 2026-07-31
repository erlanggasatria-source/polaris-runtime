import { IPlugin } from '../core/types';
import { logger } from '../core/logger';
import { successResult, errorResult } from '../core/types';

export const WorkspacePlugin: IPlugin = {
  name: 'workspace',
  version: '1.0.0',
  description: 'Workspace management: set global context (Map<string, any>)',

  capabilities: [
    {
      name: 'workspace/cap-set-context',
      description: 'Set global context (key-value pairs)',
      run: (input) => {
        logger.verbose('[Workspace] Setting global context:', input);
        return successResult(
          input,
          'workspace',
          undefined,
          'Global context updated'
        );
      }
    },
    {
      name: 'workspace/cap-get-context',
      description: 'Get current global context (read-only)',
      run: (input, context) => {
        const ctx = Object.fromEntries(context.context);
        logger.verbose('[Workspace] Getting global context');
        return successResult(
          ctx,
          'workspace',
          undefined,
          'Global context retrieved'
        );
      }
    }
  ],

  workflows: [
    {
      name: 'workspace/wf-set-context',
      description: '🔒 ALLOWED: Set global context setelah login atau switch workspace',
      allowed: [],
      steps: [
        { name: 'SetContext', useCapability: 'workspace/cap-set-context' }
      ]
    },
    {
      name: 'workspace/wf-get-context',
      description: 'Get current global context (read-only)',
      allowed: [],
      steps: [
        { name: 'GetContext', useCapability: 'workspace/cap-get-context' }
      ]
    }
  ]
};