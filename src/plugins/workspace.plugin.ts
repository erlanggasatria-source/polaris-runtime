import { IPlugin } from '../core/types';

export const WorkspacePlugin: IPlugin = {
  name: 'workspace',
  version: '1.0.0',
  description: 'Workspace management: set global context (Map<string, any>)',

  capabilities: [
    {
      name: 'workspace/cap-set-context',
      description: 'Set global context (key-value pairs)',
      run: (input) => {
        // Input bisa berupa object dengan key-value apa saja
        return input; // Langsung return input sebagai context update
      }
    },
    {
      name: 'workspace/cap-get-context',
      description: 'Get current global context (read-only)',
      run: (input, context) => {
        return Object.fromEntries(context.context);
      }
    }
  ],

  workflows: [
    {
      name: 'workspace/wf-set-context',
      description: '🔒 ALLOWED: Set global context setelah login atau switch workspace',
      allowed: [], // Tidak ada guard, karena ini workflow untuk set context
      steps: [
        { name: 'SetContext', useCapability: 'workspace/cap-set-context' }
      ]
    },
    {
      name: 'workspace/wf-get-context',
      description: 'Get current global context (read-only)',
      allowed: [], // Tidak perlu guard, read-only
      steps: [
        { name: 'GetContext', useCapability: 'workspace/cap-get-context' }
      ]
    }
  ]
};