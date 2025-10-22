const { ServerMonitor } = require('./dist');

async function testMonitor() {
  console.log('🧪 Testing Server Monitor Package...\n');

  const monitor = new ServerMonitor({
    interval: 5000, // 5 seconds for testing
    dbPath: './test-monitor.db',
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    enableDiskMonitoring: true,
    enablePM2Monitoring: false // Disable PM2 for testing
  });

  monitor.on('initialized', () => {
    console.log('✅ Monitor initialized');
  });

  monitor.on('started', () => {
    console.log('✅ Monitoring started');
  });

  monitor.on('memoryMetrics', (metrics) => {
    console.log(`📊 Memory: ${metrics.percentage.toFixed(2)}% (${(metrics.used / 1024 / 1024 / 1024).toFixed(2)} GB used)`);
  });

  monitor.on('cpuMetrics', (metrics) => {
    console.log(`📊 CPU: ${metrics.percentage.toFixed(2)}%`);
  });

  monitor.on('diskMetrics', (metrics) => {
    console.log(`📊 Disk: ${metrics.percentage.toFixed(2)}% (${(metrics.free / 1024 / 1024 / 1024).toFixed(2)} GB free)`);
  });

  monitor.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  try {
    await monitor.initialize();
    await monitor.start();

    // Test immediate data collection
    console.log('\n🔍 Testing immediate data collection...');
    const memory = await monitor.getMemoryUsage();
    console.log(`Memory: ${memory.percentage.toFixed(2)}% used`);
    
    const cpu = await monitor.getCpuUsage();
    console.log(`CPU: ${cpu.percentage.toFixed(2)}% used`);
    
    const disk = await monitor.getDiskUsage();
    console.log(`Disk: ${disk.percentage.toFixed(2)}% used (${(disk.free / 1024 / 1024 / 1024).toFixed(2)} GB free)`);
    
    if (disk.topFolders && disk.topFolders.length > 0) {
      console.log('\n📁 Top disk usage by folders:');
      disk.topFolders.slice(0, 5).forEach((folder, index) => {
        const sizeGB = (folder.size / 1024 / 1024 / 1024).toFixed(2);
        console.log(`   ${index + 1}. ${folder.path}: ${sizeGB} GB (${folder.percentage.toFixed(1)}%)`);
      });
    }

    // Let it run for 15 seconds to collect some data
    setTimeout(async () => {
      console.log('\n📈 Testing historical data...');
      const history = await monitor.getHistoricalData('memory', 5);
      console.log(`Memory history: ${history.length} records collected`);

      const latest = await monitor.getLatestMetrics();
      console.log('Latest metrics available:', {
        memory: latest.memory ? '✅' : '❌',
        cpu: latest.cpu ? '✅' : '❌',
        disk: latest.disk ? '✅' : '❌'
      });

      console.log('\n🛑 Stopping monitor...');
      await monitor.stop();
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }, 15000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMonitor();