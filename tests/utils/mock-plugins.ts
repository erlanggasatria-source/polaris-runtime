// tests/utils/mock-plugins.ts
import { IPlugin, successResult, errorResult } from '../../src/core/types';

// ============================================
// 1. MOCK PLUGIN: GREET
// ============================================
export const createGreetPlugin = (): IPlugin => ({
  name: 'greet',
  version: '1.0.0',
  description: 'Greet plugin for testing',
  capabilities: [
    {
      name: 'greet/cap-say-hello',
      description: 'Say hello to a user',
      run: (input) => {
        const name = input?.payload?.name || input?.name || 'World';
        return successResult({ message: `Hello, ${name}!` }, 'greet', undefined, 'Greeted');
      }
    }
  ],
  workflows: [
    {
      name: 'greet/wf-hello',
      description: 'Say hello workflow',
      steps: [{ name: 'SayHello', useCapability: 'greet/cap-say-hello' }]
    }
  ]
});

// ============================================
// 2. MOCK PLUGIN: REPO (In-memory)
// ============================================
export const createRepoPlugin = (): IPlugin => {
  const store: Record<string, any[]> = {};

  return {
    name: 'repo',
    version: '1.0.0',
    description: 'Mock repository',
    capabilities: [
      {
        name: 'repo/cap-save',
        description: 'Save data',
        run: (input) => {
          const domain = input.domain;
          const data = input.data;
          if (!data) return errorResult('No data', domain);
          if (!store[domain]) store[domain] = [];
          const record = { id: `mock-${Date.now()}`, ...data };
          store[domain].push(record);
          return successResult(record, domain, record.id, 'Saved');
        }
      },
      {
        name: 'repo/cap-list',
        description: 'List data',
        run: (input) => {
          const domain = input.domain;
          if (!domain) return errorResult('Domain required');
          return successResult(store[domain] || [], domain, undefined, `${store[domain]?.length || 0} records`);
        }
      }
    ],
    workflows: []
  };
};

// ============================================
// 3. MOCK PLUGIN: ADVANCE
// ============================================
export const createAdvancePlugin = (): IPlugin => ({
  name: 'advance',
  version: '1.0.0',
  description: 'Mock advance',
  capabilities: [
    {
      name: 'advance/cap-process',
      description: 'Process advance payment',
      run: (input) => {
        const { amount, accountId } = input;
        if (!amount || amount <= 0) {
          return errorResult('Invalid amount', 'advance');
        }
        return successResult(
          { transactionId: `adv-${Date.now()}`, amount, accountId, status: 'paid' },
          'advance',
          `adv-${Date.now()}`,
          'Advance processed'
        );
      }
    }
  ],
  workflows: []
});

// ============================================
// 4. MOCK PLUGIN: JOURNAL
// ============================================
export const createJournalPlugin = (): IPlugin => ({
  name: 'journal',
  version: '1.0.0',
  description: 'Mock journal',
  capabilities: [
    {
      name: 'journal/cap-record',
      description: 'Record journal entry',
      run: (input) => {
        const { amount, accountId, transactionId } = input;
        if (!amount || !transactionId) {
          return errorResult('Missing journal data', 'journal');
        }
        return successResult(
          {
            journalId: `jrn-${Date.now()}`,
            transactionId,
            amount,
            accountId,
            debit: 'Advance',
            credit: 'Cash',
            status: 'posted'
          },
          'journal',
          `jrn-${Date.now()}`,
          'Journal recorded'
        );
      }
    }
  ],
  workflows: []
});

// ============================================
// 5. MOCK PLUGIN: WORKSPACE (untuk context)
// ============================================
export const createWorkspacePlugin = (): IPlugin => ({
  name: 'workspace',
  version: '1.0.0',
  description: 'Workspace context',
  capabilities: [
    {
      name: 'workspace/cap-set-context',
      run: (input) => successResult(input, 'workspace', undefined, 'Context updated')
    }
  ],
  workflows: [
    {
      name: 'workspace/wf-set-context',
      steps: [{ name: 'SetContext', useCapability: 'workspace/cap-set-context' }]
    }
  ]
});