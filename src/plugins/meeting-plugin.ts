import { IPlugin } from '../core/types';
import { logger } from '../core/logger';
import { successResult, errorResult } from '../core/types';

export const MeetingPlugin: IPlugin = {
  name: 'meeting',
  version: '1.0.0',
  description: 'Meeting management - domain pertama Commites',

  capabilities: [
    {
      name: 'meeting/cap-validate',
      description: 'Validate meeting data and prepare for repository',
      run: (input) => {
        logger.verbose('[Meeting] Validating meeting data');

        if (!input.title || input.title.trim() === '') {
          logger.warn('[Meeting] Validation failed: Title is required');
          return errorResult('Title is required', 'meetings');
        }
        if (!input.date) {
          logger.warn('[Meeting] Validation failed: Date is required');
          return errorResult('Date is required', 'meetings');
        }

        const data = {
          title: input.title.trim(),
          date: input.date,
          status: 'SCHEDULED',
          description: input.description || '',
          location: input.location || '',
          createdBy: input.createdBy || 'unknown',
          workspaceId: input.workspaceId || 'unknown'
        };

        logger.verbose('[Meeting] Validation passed');
        return successResult(
          { domain: 'meetings', data },
          'meetings',
          undefined,
          'Meeting data validated'
        );
      }
    }
  ],

  workflows: [
    {
      name: 'meeting/wf-create',
      description: 'Create new meeting with validation',
      steps: [
        { name: 'Validate', useCapability: 'meeting/cap-validate' },
        { name: 'Save', useCapability: 'repo/cap-save', dependsOn: ['Validate'] },
        { name: 'List', useCapability: 'repo/cap-list', dependsOn: ['Save'] }
      ]
    },
    {
      name: 'meeting/wf-list',
      description: 'List all meetings',
      steps: [
        { name: 'List', useCapability: 'repo/cap-list' }
      ]
    },
    {
      name: 'meeting/wf-get',
      description: 'Get meeting by ID',
      steps: [
        { name: 'Get', useCapability: 'repo/cap-get' }
      ]
    },
    {
      name: 'meeting/wf-update',
      description: 'Update meeting by ID',
      steps: [
        { name: 'Update', useCapability: 'repo/cap-update' }
      ]
    },
    {
      name: 'meeting/wf-delete',
      description: 'Delete meeting by ID',
      steps: [
        { name: 'Delete', useCapability: 'repo/cap-delete' }
      ]
    }
  ]
};