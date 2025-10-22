const { ServerMonitor } = require('./dist');

async function quickTest() {
  console.log('🧪 Quick Test - Server Monitor Package...\n');

  const monitor = new ServerMonitor({
    interval: 2000, // 2 seconds
    dbPath: './quick-test.db',
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    enableDiskMonitoring: true,
    enablePM2Monitoring: false
  });

  try {
    await monitor.initialize();
    console.log('✅ Initialize: OK');
    
    // Test immediate collection
    const memory = await monitor.getMemoryUsage();
    console.log(`✅ Memory: ${memory.percentage.toFixed(2)}% used`);
    
    const cpu = await monitor.getCpuUsage();
    console.log(`✅ CPU: ${cpu.percentage.toFixed(2)}% used`);
    
    const disk = await monitor.getDiskUsage();
    console.log(`✅ Disk: ${disk.percentage.toFixed(2)}% used (${(disk.free / 1024 / 1024 / 1024).toFixed(2)} GB free)`);
    
    console.log('\n🎉 All components working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();