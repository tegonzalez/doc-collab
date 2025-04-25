/**
 * AI instance configuration - temporarily disabled
 * 
 * NOTE: The 'genkit' and '@genkit-ai/googleai' packages are not installed.
 * This file is commented out until these dependencies are properly installed.
 */

/*
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
*/

// Export a placeholder to avoid import errors
export const ai = {
  runPrompt: () => Promise.resolve({text: 'AI functionality is disabled'}),
};
