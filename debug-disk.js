const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testDiskCommands() {
  console.log('Testing disk commands...\n');
  
  try {
    console.log('1. Testing df command:');
    const dfResult = await execAsync('df -h / | tail -1');
    console.log('df output:', dfResult.stdout);
    
    const parts = dfResult.stdout.trim().split(/\s+/);
    console.log('df parts:', parts);
    
    console.log('\n2. Testing du command:');
    const duResult = await execAsync('du -sh /System /Applications /Users /Library /private 2>/dev/null | head -5');
    console.log('du output:', duResult.stdout);
    
    console.log('\n3. Testing parseSize function:');
    function parseSize(sizeStr) {
      const units = {
        'K': 1024,
        'M': 1024 * 1024,
        'G': 1024 * 1024 * 1024,
        'T': 1024 * 1024 * 1024 * 1024
      };

      const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT])i?$/i);
      if (match) {
        const size = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        return Math.round(size * (units[unit] || 1));
      }

      const num = parseFloat(sizeStr);
      return isNaN(num) ? 0 : Math.round(num);
    }
    
    console.log('228Gi ->', parseSize('228Gi'));
    console.log('11Gi ->', parseSize('11Gi'));
    console.log('72Gi ->', parseSize('72Gi'));
    
    if (parts.length >= 4) {
      const total = parseSize(parts[1]);
      const used = parseSize(parts[2]);
      const free = parseSize(parts[3]);
      
      console.log('\n4. Parsed disk info:');
      console.log('Total:', total, 'bytes');
      console.log('Used:', used, 'bytes');
      console.log('Free:', free, 'bytes');
      console.log('Percentage:', ((used / total) * 100).toFixed(2) + '%');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDiskCommands();