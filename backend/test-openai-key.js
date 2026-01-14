import dotenv from 'dotenv';
dotenv.config();

import { openAIConfig } from './services/openai-request-manager.js';

console.log('Testing OpenAI Config...');
console.log('==================');

const apiKey = openAIConfig.OPENAI_API_KEY;
console.log(`API Key: ${apiKey ? `${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'}`);
console.log(`Model: ${openAIConfig.OPENAI_MODEL}`);
console.log('==================');
