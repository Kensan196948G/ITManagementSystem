#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Starting test execution...');
  
  // 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.JEST_SILENT = 'false';
  
  // テストの実行
  const result = execSync(
    'npx jest --verbose --runInBand --no-cache "src/tests/**/*.test.ts"',
    {
      stdio: 'inherit',
      encoding: 'utf-8'
    }
  );
  
  console.log('Tests completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}