// Global test setup
import * as fs from 'fs';
import * as path from 'path';

// Clean up test databases before each test suite
beforeEach(() => {
  const testDbPattern = /test-.*\.db$/;
  const files = fs.readdirSync(process.cwd());
  
  files.forEach(file => {
    if (testDbPattern.test(file)) {
      try {
        fs.unlinkSync(path.join(process.cwd(), file));
      } catch (error) {
        // Ignore errors if file doesn't exist
      }
    }
  });
});