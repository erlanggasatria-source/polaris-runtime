// dummy.plugin.ts
import type { IPlugin } from"../core/types.js"

export const DummyPlugin: IPlugin = {
  name: 'dummy',
  version: '1.0.0',
  description: 'Plugin contoh untuk demonstrasi Polaris Runtime',

  capabilities: [
    // ===== CAPABILITY: GREET =====
    {
      name: 'dummy/cap-greet',
      description: 'Menyapa pengguna dengan nama yang diberikan',
      run: (input) => {
        return { message: `Hello, ${input.name || 'User'}!` };
      }
    },

    // ===== CAPABILITY: ADD =====
    {
      name: 'dummy/cap-add',
      description: 'Menjumlahkan dua angka: a + b',
      run: (input) => {
        return { result: (input.a || 0) + (input.b || 0) };
      }
    },

    // ===== CAPABILITY: MULTIPLY =====
    {
      name: 'dummy/cap-multiply',
      description: 'Mengalikan dua angka: a * b',
      run: (input) => {
        return { result: (input.a || 0) * (input.b || 0) };
      }
    },

    // ===== CAPABILITY: SET NAME =====
    {
      name: 'dummy/cap-set-name',
      description: 'Menyimpan nama ke context',
      run: (input, context) => {
        const name = input.name || 'User';
        context.variables.set('name', name);
        return { stored: true, name };
      }
    },

    // ===== CAPABILITY: ADD GREETING =====
    {
      name: 'dummy/cap-add-greeting',
      description: 'Menambahkan sapaan ke nama dari context',
      run: (input, context) => {
        const name = context.variables.get('name') || 'User';
        return { greeting: `Hello, ${name}!` };
      }
    },

    // ===== CAPABILITY: FINALIZE =====
    {
      name: 'dummy/cap-finalize',
      description: 'Menggabungkan hasil dari step sebelumnya',
      run: (input) => {
        return {
          final: true,
          message: input.greeting || 'No greeting',
          metadata: input
        };
      }
    },

    // ===== CAPABILITY: PREPARE JOURNAL =====
    {
      name: 'dummy/cap-prepare-journal',
      description: 'Menyiapkan data untuk journal dari dependency',
      run: (input) => {
        const nominal = input.nominal || input.amount || 0;
        const accountId = input.accountId || 'UNKNOWN';
        const reference = input.advance || input.reimburseId || 'REF-001';

        return {
          debit: nominal,
          credit: nominal,
          account: accountId,
          reference: reference,
          description: `Journal for ${reference}`
        };
      }
    },

    // ===== CAPABILITY: POST JOURNAL =====
    {
      name: 'dummy/cap-post-journal',
      description: 'Memposting journal (reusable)',
      run: (input) => {
        const { debit, credit, account, reference, description } = input;

        const journal = {
          id: `JRN-${Date.now()}`,
          debit,
          credit,
          account,
          reference,
          description,
          createdAt: new Date().toISOString()
        };

        console.log('📝 Journal created:', journal);

        return {
          journalId: journal.id,
          status: 'POSTED',
          journal
        };
      }
    }
    ,
    //cap slow timeout
    {
      name: 'dummy/cap-slow',
      description: 'Capability yang sengaja lambat (5 detik)',
      run: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { status: 'done' };
      }
    }
  ],

  workflows: [
    // ===== WORKFLOW: GREET =====
    {
      name: 'dummy/wf-greet',
      description: 'Alur sederhana untuk menyapa pengguna',
      steps: [
        { name: 'SayHello', useCapability: 'dummy/cap-greet' }
      ]
    },

    // ===== WORKFLOW: MATH =====
    {
      name: 'dummy/wf-math',
      description: 'Alur untuk operasi matematika dasar',
      steps: [
        { name: 'AddNumbers', useCapability: 'dummy/cap-add' },
        { name: 'MultiplyResult', useCapability: 'dummy/cap-multiply' }
      ]
    },

    // ===== WORKFLOW: 3 STEP FLOW =====
    {
      name: 'dummy/wf-flow',
      description: 'Workflow 3 step: set name → add greeting → finalize',
      steps: [
        { name: 'SetName', useCapability: 'dummy/cap-set-name' },
        { name: 'AddGreeting', useCapability: 'dummy/cap-add-greeting' },
        { name: 'Finalize', useCapability: 'dummy/cap-finalize' }
      ]
    },

    // ===== WORKFLOW: JOURNAL (dengan dependsOn) =====
    {
      name: 'dummy/wf-journal',
      description: 'Workflow dengan dependsOn: validate → prepare → post',
      steps: [
        { 
          name: 'Validate', 
          useCapability: 'dummy/cap-greet' 
        },
        // Output: { message: 'Hello, Budi!' }

        { 
          name: 'PrepareJournal', 
          useCapability: 'dummy/cap-prepare-journal',
          dependsOn: ['Validate']
        },
        // dependsOn: ambil output dari Validate
        // Input: { message: 'Hello, Budi!' }
        // Output: { debit: 0, credit: 0, account: 'UNKNOWN', reference: 'REF-001' }

        { 
          name: 'PostJournal', 
          useCapability: 'dummy/cap-post-journal',
          dependsOn: ['PrepareJournal']
        }
        // dependsOn: ambil output dari PrepareJournal
        // Input: { debit: 0, credit: 0, account: 'UNKNOWN', reference: 'REF-001' }
        // Output: { journalId: 'JRN-xxx', status: 'POSTED' }
      ]
    },

    // ===== WORKFLOW: JOURNAL DENGAN DATA LENGKAP =====
    {
      name: 'dummy/wf-journal-full',
      description: 'Workflow dengan data lengkap untuk journal',
      steps: [
        // Step 1: Validasi Settlement
        { 
          name: 'ValidateSettlement', 
          useCapability: 'dummy/cap-greet' 
        },
        // Output: { message: 'Hello, Budi!' } → sebagai nominal

        // Step 2: Hitung Advance
        { 
          name: 'CalculateAdvance', 
          useCapability: 'dummy/cap-add' 
        },
        // Output: { result: 8 } → sebagai nominal

        // Step 3: Prepare Journal (gabung dari 2 step)
        { 
          name: 'PrepareJournal', 
          useCapability: 'dummy/cap-prepare-journal',
          dependsOn: ['ValidateSettlement', 'CalculateAdvance']
        },
        // dependsOn: ambil dari ValidateSettlement dan CalculateAdvance
        // Input: { message: 'Hello, Budi!', result: 8 }
        // Output: { debit: 0, credit: 0, account: 'UNKNOWN', reference: 'REF-001' }

        // Step 4: Post Journal
        { 
          name: 'PostJournal', 
          useCapability: 'dummy/cap-post-journal',
          dependsOn: ['PrepareJournal']
        }
      ]
    },

        // Tambahkan workflow baru dengan guard
    {
      name: 'dummy/wf-secure',
      description: 'Workflow dengan guard: hanya TREASURER yang bisa execute',
      allowed: [
        { key: 'role', value: 'TREASURER', source: 'context', operator: 'eq' }
      ],
      steps: [
        { name: 'SayHello', useCapability: 'dummy/cap-greet' }
      ]
    },
    {
      name: 'dummy/wf-secure-status',
      description: 'Workflow dengan guard: status WAITING_APPROVAL dan role TREASURER',
      allowed: [
        { key: 'role', value: 'TREASURER', source: 'context', operator: 'eq' },
        { key: 'status', value: 'WAITING_APPROVAL', source: 'input', operator: 'eq' }
      ],
      steps: [
        { name: 'SayHello', useCapability: 'dummy/cap-greet' }
      ]
    },
    // dummy slow
      {
    name: 'dummy/wf-slow',
    description: 'Workflow dengan step lambat (timeout 2 detik)',
    steps: [
      { 
        name: 'SlowStep', 
        useCapability: 'dummy/cap-slow',
        timeout: 2000 // 2 detik, akan timeout karena cap-slow butuh 5 detik
      }
    ]
  },
  {
    name: 'dummy/wf-fast',
    description: 'Workflow dengan step lambat (timeout 10 detik)',
    steps: [
      { 
        name: 'SlowStep', 
        useCapability: 'dummy/cap-slow',
        timeout: 10000 // 10 detik, akan berhasil
      }
    ]
  }
  ]
};