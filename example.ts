import { ServerMonitor } from '../src';

// Example usage of the server monitor package
async function example() {
  // Create a new instance with custom configuration
  const monitor = new ServerMonitor({
    interval: 30000, // Collect metrics every 30 seconds
    dbPath: './example-metrics.db',
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    enableDiskMonitoring: true,
    enablePM2Monitoring: true,
    maxRecords: 5000
  });

  // Set up event listeners
  monitor.on('initialized', () => {
    console.log('🚀 Server monitor initialized');
  });

  monitor.on('started', () => {
    console.log('▶️  Monitoring started');
  });

  monitor.on('memoryMetrics', (metrics) => {
    console.log('💾 Memory Usage:', {
      percentage: `${metrics.percentage.toFixed(2)}%`,
      used: `${(metrics.used / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(metrics.free / 1024 / 1024 / 1024).toFixed(2)} GB`,
      topProcesses: metrics.topProcesses.slice(0, 5).map(p => `${p.name} (${p.memoryUsage}%)`)
    });
  });

  monitor.on('cpuMetrics', (metrics) => {
    console.log('🖥️  CPU Usage:', {
      percentage: `${metrics.percentage.toFixed(2)}%`,
      loadAverage: metrics.loadAverage.map(avg => avg.toFixed(2)),
      topProcesses: metrics.topProcesses.slice(0, 5).map(p => `${p.name} (${p.cpuUsage}%)`)
    });
  });

  monitor.on('diskMetrics', (metrics) => {
    console.log('💿 Disk Usage:', {
      percentage: `${metrics.percentage.toFixed(2)}%`,
      used: `${(metrics.used / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(metrics.free / 1024 / 1024 / 1024).toFixed(2)} GB`,
      topFolders: metrics.topFolders.slice(0, 5).map(f => `${f.path} (${(f.size / 1024 / 1024).toFixed(2)} MB)`)
    });
  });

  monitor.on('pm2Metrics', (processes) => {
    console.log('⚙️  PM2 Processes:', processes.map(p => 
      `${p.name} - ${p.status} (CPU: ${p.cpu}%, Memory: ${(p.memory / 1024 / 1024).toFixed(2)} MB)`
    ));
  });

  monitor.on('error', (error) => {
    console.error('❌ Monitor error:', error);
  });

  try {
    // Initialize and start monitoring
    await monitor.initialize();
    await monitor.start();

    // Get current metrics on demand
    console.log('\n🔍 Getting current metrics...');
    const currentMemory = await monitor.getMemoryUsage();
    console.log('Current Memory Usage:', `${currentMemory.percentage.toFixed(2)}%`);

    const currentCpu = await monitor.getCpuUsage();
    console.log('Current CPU Usage:', `${currentCpu.percentage.toFixed(2)}%`);

    // Get historical data after some time
    setTimeout(async () => {
      console.log('\n📊 Getting historical data...');
      const memoryHistory = await monitor.getHistoricalData('memory', 10);
      console.log(`Memory history (last 10 records): ${memoryHistory.length} entries`);

      const latestMetrics = await monitor.getLatestMetrics();
      console.log('Latest metrics available:', {
        memory: latestMetrics.memory ? 'Available' : 'None',
        cpu: latestMetrics.cpu ? 'Available' : 'None',
        disk: latestMetrics.disk ? 'Available' : 'None',
        pm2: latestMetrics.pm2 ? 'Available' : 'None'
      });
    }, 65000); // After 65 seconds (should have at least 2 data points)

    // Graceful shutdown after 2 minutes
    setTimeout(async () => {
      console.log('\n⏹️  Stopping monitor...');
      await monitor.stop();
      console.log('✅ Monitor stopped');
      process.exit(0);
    }, 120000);

  } catch (error) {
    console.error('Failed to start monitoring:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the example
example().catch(console.error);