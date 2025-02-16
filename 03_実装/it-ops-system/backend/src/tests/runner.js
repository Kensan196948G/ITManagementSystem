const { spawn } = require('child_process');
const path = require('path');

console.log('Test runner starting...');

const jest = spawn('node', [
  path.join(__dirname, '..', '..', 'node_modules', 'jest', 'bin', 'jest.js'),
  '--verbose',
  '--runInBand',
  '--no-cache',
  'src/tests/**/*.test.ts'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    FORCE_COLOR: '1'
  }
});

jest.on('error', (error) => {
  console.error('Failed to start test process:', error);
});

jest.on('exit', (code, signal) => {
  console.log(`Test process exited with code ${code} and signal ${signal}`);
});