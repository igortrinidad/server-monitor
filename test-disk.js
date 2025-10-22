const { DiskMonitor } = require('./dist/monitors/disk');

async function testDiskMonitor() {
  console.log('🧪 Testing DiskMonitor specifically...\n');

  const monitor = new DiskMonitor();

  try {
    console.log('1. Testing getDiskUsage...');
    
    // Set a timeout for the test
    const diskUsagePromise = monitor.getDiskUsage();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
    );

    const result = await Promise.race([diskUsagePromise, timeoutPromise]);
    
    console.log('✅ Disk usage result:');
    console.log(`   Total: ${(result.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Used: ${(result.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Free: ${(result.free / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Percentage: ${result.percentage.toFixed(2)}%`);
    console.log(`   Top folders: ${result.topFolders.length} found`);
    
    if (result.topFolders.length > 0) {
      console.log('   Top 3 folders:');
      result.topFolders.slice(0, 3).forEach((folder, index) => {
        console.log(`     ${index + 1}. ${folder.path}: ${(folder.size / 1024 / 1024 / 1024).toFixed(2)} GB (${folder.percentage.toFixed(1)}%)`);
      });
    }
    
    console.log('\n✅ DiskMonitor test completed successfully!');
    
  } catch (error) {
    console.error('❌ DiskMonitor test failed:', error.message);
    process.exit(1);
  }
}

testDiskMonitor();