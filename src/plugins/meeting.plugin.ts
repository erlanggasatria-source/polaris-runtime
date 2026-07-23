import { IPlugin } from '../core/types';

export const MeetingPlugin: IPlugin = {
  name: 'meeting',
  version: '1.0.0',
  description: 'Meeting management - domain pertama Commites',

  capabilities: [
    // ===== VALIDATE =====
    {
    name: 'meeting/cap-validate',
    description: 'Validate meeting data and prepare for repository',
    run: (input) => {
        if (!input.title || input.title.trim() === '') {
        return {
            status: 'error',
            domain: 'meetings',
            error: 'Title is required'
        };
        }
        if (!input.date) {
        return {
            status: 'error',
            domain: 'meetings',
            error: 'Date is required'
        };
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

        return {
        status: 'success',
        domain: 'meetings',
        payload: {
            domain: 'meetings',
            data
        },
        message: 'Meeting data validated'
        };
    }
    }
  ],

  workflows: [
    {
      name: 'meeting/wf-create',
      description: 'Create meeting and return updated list',
      steps: [
        { 
          name: 'Validate', 
          useCapability: 'meeting/cap-validate' 
        },
        { 
          name: 'Save', 
          useCapability: 'repo/cap-save',
          dependsOn: ['Validate']
        },
        { 
          name: 'List', 
          useCapability: 'repo/cap-list',
          dependsOn: ['Save']
        }
      ]
    }
  ]
};