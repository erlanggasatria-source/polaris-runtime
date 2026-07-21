// dummy.plugin.ts
import type { IPlugin } from"../core/types.js"

export const DummyPlugin: IPlugin = {
  name: 'dummy',
  version: '1.0.0',
  description: 'Plugin contoh untuk demonstrasi Polaris Runtime',

  capabilities: [
    {
      name: 'dummy/cap-greet',          // LITERAL LENGKAP
      description: 'Menyapa pengguna dengan nama yang diberikan',
      run: (input) => ({ message: `Hello, ${input.name}!` })
    },
    {
      name: 'dummy/cap-add',            // LITERAL LENGKAP
      description: 'Menjumlahkan dua angka: a + b',
      run: (input) => ({ result: input.a + input.b })
    },
    {
      name: 'dummy/cap-multiply',       // LITERAL LENGKAP
      description: 'Mengalikan dua angka: a * b',
      run: (input) => ({ result: input.a * input.b })
    }
  ],

  workflows: [
    {
      name: 'dummy/wf-greet',           // LITERAL LENGKAP
      description: 'Alur sederhana untuk menyapa pengguna',
      steps: [
        { 
          name: 'SayHello', 
          useCapability: 'dummy/cap-greet'  // LITERAL LENGKAP
        }
      ]
    },
    {
      name: 'dummy/wf-math',            // LITERAL LENGKAP
      description: 'Alur untuk operasi matematika dasar',
      steps: [
        { 
          name: 'AddNumbers', 
          useCapability: 'dummy/cap-add'    // LITERAL LENGKAP
        },
        { 
          name: 'MultiplyResult', 
          useCapability: 'dummy/cap-multiply',  // LITERAL LENGKAP
          dependsOn: ['AddNumbers']
        }
      ]
    }
  ]
};