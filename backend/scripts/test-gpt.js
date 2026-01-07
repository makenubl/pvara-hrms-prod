/**
 * Quick test script for GPT-5.2 API
 * Run: node backend/scripts/test-gpt.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from root .env or backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment');
  process.exit(1);
}

async function testGPT() {
  console.log('Testing GPT-5.2 API...\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        messages: [
          { 
            role: 'system', 
            content: 'You are a task parser. Return JSON only.' 
          },
          { 
            role: 'user', 
            content: 'Create task: Review budget report by Friday, high priority' 
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status);
      console.error(error);
      return;
    }

    const data = await response.json();
    console.log('✅ GPT-5.2 Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n📝 Parsed content:');
    console.log(data.choices[0]?.message?.content);

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testGPT();
