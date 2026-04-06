import * as fs from 'fs';
import * as path from 'path';

/**
 * Load environment variables from .env file for integration tests
 * This is needed because vitest doesn't load .env automatically
 */
export function loadEnvForTests() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvForTests();
