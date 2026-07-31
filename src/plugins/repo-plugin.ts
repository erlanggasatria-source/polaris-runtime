import { IPlugin } from '../core/types';
import { logger } from '../core/logger';
import { successResult, errorResult } from '../core/types';

const DB_KEY = 'polaris_db';

// ===== HELPERS =====
function getDB(): Record<string, any[]> {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : {};
}

function saveDB(db: Record<string, any[]>): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getCollection(db: Record<string, any[]>, domain: string): any[] {
  if (!db[domain]) {
    db[domain] = [];
  }
  return db[domain];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ===== PLUGIN =====
export const RepoPlugin: IPlugin = {
  name: 'repo',
  version: '1.0.0',
  description: 'Repository - mock database with localStorage',

  capabilities: [
    {
      name: 'repo/cap-save',
      description: 'Save data to repository',
      run: (input) => {
        logger.verbose(`[Repo] Saving to domain: ${input.domain}`);

        const data = input.payload?.data || input.data;
        const domain = input.payload?.domain || input.domain;

        if (!data) {
          logger.warn('[Repo] No data to save');
          return errorResult('No data to save', domain);
        }

        try {
          const db = getDB();
          const collection = getCollection(db, domain);
          const record = { id: generateId(), ...data };
          collection.push(record);
          saveDB(db);

          logger.verbose(`[Repo] Saved record: ${record.id}`);
          return successResult(record, domain, record.id, `Record saved to ${domain}`);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error('[Repo] Save failed:', error);
          return errorResult(error, domain);
        }
      }
    },

    {
      name: 'repo/cap-get',
      description: 'Get data from repository',
      run: (input) => {
        logger.verbose(`[Repo] Getting from domain: ${input.domain}, id: ${input.id}`);

        const domain = input.payload?.domain || input.domain;
        const id = input.payload?.id || input.id;

        if (!domain || !id) {
          logger.warn('[Repo] Domain and id are required');
          return errorResult('Domain and id are required', domain);
        }

        try {
          const db = getDB();
          const collection = getCollection(db, domain);
          const record = collection.find((r: any) => r.id === id);

          if (!record) {
            logger.warn(`[Repo] Record not found: ${id}`);
            return errorResult(`Record with id "${id}" not found`, domain, id);
          }

          logger.verbose(`[Repo] Found record: ${id}`);
          return successResult(record, domain, id, `Record found in ${domain}`);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error('[Repo] Get failed:', error);
          return errorResult(error, domain);
        }
      }
    },

    {
      name: 'repo/cap-list',
      description: 'List all data from repository',
      run: (input) => {
        const domain = input.payload?.domain || input.domain;

        if (!domain) {
          logger.warn('[Repo] Domain is required');
          return errorResult('Domain is required');
        }

        try {
          const db = getDB();
          const collection = getCollection(db, domain);

          logger.verbose(`[Repo] Listing ${collection.length} records from: ${domain}`);
          return successResult(
            collection,
            domain,
            undefined,
            `${collection.length} records found in ${domain}`
          );
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error('[Repo] List failed:', error);
          return errorResult(error, domain);
        }
      }
    },

    {
      name: 'repo/cap-update',
      description: 'Update data in repository',
      run: (input) => {
        logger.verbose(`[Repo] Updating domain: ${input.domain}, id: ${input.id}`);

        const domain = input.payload?.domain || input.domain;
        const id = input.payload?.id || input.id;
        const data = input.payload?.data || input.data;

        if (!domain || !id) {
          logger.warn('[Repo] Domain and id are required');
          return errorResult('Domain and id are required', domain);
        }

        try {
          const db = getDB();
          const collection = getCollection(db, domain);
          const index = collection.findIndex((r: any) => r.id === id);

          if (index === -1) {
            logger.warn(`[Repo] Record not found: ${id}`);
            return errorResult(`Record with id "${id}" not found`, domain, id);
          }

          collection[index] = { ...collection[index], ...data };
          saveDB(db);

          logger.verbose(`[Repo] Updated record: ${id}`);
          return successResult(
            collection[index],
            domain,
            id,
            `Record updated in ${domain}`
          );
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error('[Repo] Update failed:', error);
          return errorResult(error, domain);
        }
      }
    },

    {
      name: 'repo/cap-delete',
      description: 'Delete data from repository',
      run: (input) => {
        logger.verbose(`[Repo] Deleting from domain: ${input.domain}, id: ${input.id}`);

        const domain = input.payload?.domain || input.domain;
        const id = input.payload?.id || input.id;

        if (!domain || !id) {
          logger.warn('[Repo] Domain and id are required');
          return errorResult('Domain and id are required', domain);
        }

        try {
          const db = getDB();
          const collection = getCollection(db, domain);
          const filtered = collection.filter((r: any) => r.id !== id);

          if (filtered.length === collection.length) {
            logger.warn(`[Repo] Record not found: ${id}`);
            return errorResult(`Record with id "${id}" not found`, domain, id);
          }

          db[domain] = filtered;
          saveDB(db);

          logger.verbose(`[Repo] Deleted record: ${id}`);
          return successResult(undefined, domain, id, `Record deleted from ${domain}`);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error('[Repo] Delete failed:', error);
          return errorResult(error, domain);
        }
      }
    }
  ],

  workflows: []
};