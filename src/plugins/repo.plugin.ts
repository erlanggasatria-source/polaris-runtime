import { IPlugin } from '../core/types';

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
    // ===== SAVE =====
    {
    name: 'repo/cap-save',
    description: 'Save data to repository',
    run: (input) => {
        const data = input.payload?.data || input.data;
        const domain = input.payload?.domain || input.domain;

        const db = getDB();
        const collection = getCollection(db, domain);        
        const record = { id: generateId(), ...data };
        collection.push(record);
        saveDB(db);

        console.debug('input:',input);
        console.debug('record:',record);

        // ===== STANDARD OUTPUT =====
        return {
        status: 'success',
        domain: input.domain,
        id: record.id,
        payload: record,
        message: `Record saved to ${input.domain}`
        };
    }
    },

    // ===== GET =====
    {
    name: 'repo/cap-get',
    description: 'Get data from repository',
    run: (input) => {        
        const domain = input.payload?.domain || input.domain;
        const id = input.payload?.id || input.id;

        const db = getDB();
        const collection = getCollection(db, domain);
        const record = collection.find((r: any) => r.id === id);

        if (!record) {
        return {
            status: 'error',
            domain: input.domain,
            id: input.id,
            error: `Record with id "${input.id}" not found`
        };
        }

        return {
        status: 'success',
        domain: input.domain,
        id: input.id,
        payload: record,
        message: `Record found in ${input.domain}`
        };
    }
    },

    // ===== LIST =====
    {
    name: 'repo/cap-list',
    description: 'List all data from repository',
    run: (input) => {
        const domain = input.payload?.domain || input.domain;

        const db = getDB();
        const collection = getCollection(db, domain);
        console.info('info collection: ',collection);

        return {
        status: 'success',
        domain: input.domain,
        payload: collection,
        count: collection.length,
        message: `${collection.length} records found in ${input.domain}`
        };
    }
    },

    // ===== UPDATE =====
    {
    name: 'repo/cap-update',
    description: 'Update data in repository',
    run: (input) => {
        const domain = input.payload?.domain || input.domain;
        const id = input.payload?.id || input.id;

        const db = getDB();
        const collection = getCollection(db, domain);
        const index = collection.findIndex((r: any) => r.id === id);

        if (index === -1) {
        return {
            status: 'error',
            domain: input.domain,
            id: input.id,
            error: `Record with id "${input.id}" not found`
        };
        }

        collection[index] = { ...collection[index], ...input.data };
        saveDB(db);

        return {
        status: 'success',
        domain: input.domain,
        id: input.id,
        payload: collection[index],
        message: `Record updated in ${input.domain}`
        };
    }
    },

    // ===== DELETE =====
    {
    name: 'repo/cap-delete',
    description: 'Delete data from repository',
    run: (input) => {
        const domain = input.payload?.domain || input.domain;
        const id = input.payload?.id || input.id;

        const db = getDB();
        const collection = getCollection(db, domain);
        const filtered = collection.filter((r: any) => r.id !== id);

        if (filtered.length === collection.length) {
        return {
            status: 'error',
            domain: input.domain,
            id: input.id,
            error: `Record with id "${input.id}" not found`
        };
        }

        db[input.domain] = filtered;
        saveDB(db);

        return {
        status: 'success',
        domain: input.domain,
        id: input.id,
        message: `Record deleted from ${input.domain}`
        };
    }
    }
  ],

  workflows: []
};