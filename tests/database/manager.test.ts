import { DatabaseManager } from '../../src/database/manager';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), 'test-db-' + Date.now() + '.db');
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(async () => {
    await dbManager.close();
    
    // Clean up test database file
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create database and tables successfully', async () => {
      await dbManager.initialize();
      
      // Check if database file was created
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should handle database initialization errors', async () => {
      // Try to create database in non-existent directory
      const invalidPath = '/non-existent-directory/test.db';
      const invalidDbManager = new DatabaseManager(invalidPath);

      await expect(invalidDbManager.initialize()).rejects.toThrow();
    });

    it('should work with default database path', async () => {
      const defaultDbManager = new DatabaseManager();
      await defaultDbManager.initialize();
      
      const defaultPath = path.join(process.cwd(), 'server-monitor.db');
      expect(fs.existsSync(defaultPath)).toBe(true);
      
      await defaultDbManager.close();
      
      // Clean up default database
      try {
        fs.unlinkSync(defaultPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  describe('insertMetric', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should insert metric successfully', async () => {
      const testData = { cpu: 50.5, memory: 75.2 };
      
      const id = await dbManager.insertMetric('cpu', testData);
      
      expect(id).toBeGreaterThan(0);
    });

    it('should handle complex metric data', async () => {
      const complexData = {
        percentage: 85.7,
        processes: [
          { pid: 1234, name: 'node', cpu: 15.2 },
          { pid: 5678, name: 'chrome', cpu: 8.5 }
        ],
        timestamp: new Date().toISOString()
      };
      
      const id = await dbManager.insertMetric('memory', complexData);
      
      expect(id).toBeGreaterThan(0);
    });

    it('should fail when database is not initialized', async () => {
      const uninitializedDb = new DatabaseManager(':memory:');
      
      await expect(uninitializedDb.insertMetric('cpu', { test: 'data' }))
        .rejects.toThrow('Database not initialized');
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      await dbManager.initialize();
      
      // Insert test data
      await dbManager.insertMetric('cpu', { percentage: 50 });
      await dbManager.insertMetric('memory', { percentage: 75 });
      await dbManager.insertMetric('cpu', { percentage: 60 });
      await dbManager.insertMetric('disk', { percentage: 30 });
    });

    it('should retrieve all metrics when no filters applied', async () => {
      const metrics = await dbManager.getMetrics();
      
      expect(metrics).toHaveLength(4);
      expect(metrics[0].type).toBeDefined();
      expect(metrics[0].data).toBeDefined();
      expect(metrics[0].timestamp).toBeDefined();
    });

    it('should filter metrics by type', async () => {
      const cpuMetrics = await dbManager.getMetrics('cpu');
      
      expect(cpuMetrics).toHaveLength(2);
      cpuMetrics.forEach(metric => {
        expect(metric.type).toBe('cpu');
      });
    });

    it('should limit results when specified', async () => {
      const limitedMetrics = await dbManager.getMetrics(undefined, 2);
      
      expect(limitedMetrics).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneHourLater = new Date(now.getTime() + 3600000);
      
      const metricsInRange = await dbManager.getMetrics(
        undefined, 
        undefined, 
        oneHourAgo, 
        oneHourLater
      );
      
      expect(metricsInRange.length).toBeGreaterThan(0);
      metricsInRange.forEach(metric => {
        const metricTime = new Date(metric.timestamp);
        expect(metricTime.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(metricTime.getTime()).toBeLessThanOrEqual(oneHourLater.getTime());
      });
    });

    it('should combine multiple filters', async () => {
      const filteredMetrics = await dbManager.getMetrics('cpu', 1);
      
      expect(filteredMetrics).toHaveLength(1);
      expect(filteredMetrics[0].type).toBe('cpu');
    });

    it('should return metrics in descending timestamp order', async () => {
      const metrics = await dbManager.getMetrics();
      
      for (let i = 1; i < metrics.length; i++) {
        const currentTime = new Date(metrics[i].timestamp);
        const previousTime = new Date(metrics[i - 1].timestamp);
        expect(currentTime.getTime()).toBeLessThanOrEqual(previousTime.getTime());
      }
    });
  });

  describe('getLatestMetric', () => {
    beforeEach(async () => {
      await dbManager.initialize();
      
      // Insert test data with delays to ensure different timestamps
      await dbManager.insertMetric('cpu', { percentage: 50 });
      await new Promise(resolve => setTimeout(resolve, 10));
      await dbManager.insertMetric('cpu', { percentage: 60 });
    });

    it('should return the most recent metric of specified type', async () => {
      const latestCpu = await dbManager.getLatestMetric('cpu');
      
      expect(latestCpu).not.toBeNull();
      expect(latestCpu!.type).toBe('cpu');
      expect(JSON.parse(latestCpu!.data).percentage).toBe(60);
    });

    it('should return null when no metrics of specified type exist', async () => {
      const latestMemory = await dbManager.getLatestMetric('memory');
      
      expect(latestMemory).toBeNull();
    });
  });

  describe('deleteOldMetrics', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should delete metrics older than specified days', async () => {
      // Insert a metric and manually update its timestamp to be old
      await dbManager.insertMetric('cpu', { percentage: 50 });
      
      // Simulate old data by updating timestamp directly in database
      await new Promise<void>((resolve, reject) => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10); // 10 days ago
        
        (dbManager as any).db.run(
          'UPDATE metrics SET timestamp = ? WHERE type = ?',
          [oldDate.toISOString(), 'cpu'],
          (err: Error) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      const deletedCount = await dbManager.deleteOldMetrics(5); // Delete metrics older than 5 days
      
      expect(deletedCount).toBe(1);
      
      const remainingMetrics = await dbManager.getMetrics('cpu');
      expect(remainingMetrics).toHaveLength(0);
    });

    it('should not delete recent metrics', async () => {
      await dbManager.insertMetric('cpu', { percentage: 50 });
      
      const deletedCount = await dbManager.deleteOldMetrics(5);
      
      expect(deletedCount).toBe(0);
      
      const remainingMetrics = await dbManager.getMetrics('cpu');
      expect(remainingMetrics).toHaveLength(1);
    });
  });

  describe('getMetricsCount', () => {
    beforeEach(async () => {
      await dbManager.initialize();
      
      await dbManager.insertMetric('cpu', { percentage: 50 });
      await dbManager.insertMetric('memory', { percentage: 75 });
      await dbManager.insertMetric('cpu', { percentage: 60 });
    });

    it('should return total count when no type specified', async () => {
      const totalCount = await dbManager.getMetricsCount();
      
      expect(totalCount).toBe(3);
    });

    it('should return count for specific type', async () => {
      const cpuCount = await dbManager.getMetricsCount('cpu');
      const memoryCount = await dbManager.getMetricsCount('memory');
      
      expect(cpuCount).toBe(2);
      expect(memoryCount).toBe(1);
    });

    it('should return 0 for non-existent type', async () => {
      const diskCount = await dbManager.getMetricsCount('disk');
      
      expect(diskCount).toBe(0);
    });
  });

  describe('close', () => {
    it('should close database connection successfully', async () => {
      await dbManager.initialize();
      await dbManager.close();
      
      // Subsequent operations should fail
      await expect(dbManager.insertMetric('cpu', { test: 'data' }))
        .rejects.toThrow('Database not initialized');
    });

    it('should handle closing uninitialized database', async () => {
      const uninitializedDb = new DatabaseManager(':memory:');
      
      await expect(uninitializedDb.close()).resolves.not.toThrow();
    });

    it('should handle multiple close calls', async () => {
      await dbManager.initialize();
      await dbManager.close();
      
      await expect(dbManager.close()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database corruption gracefully', async () => {
      await dbManager.initialize();
      
      // Write invalid data to database file to simulate corruption
      fs.writeFileSync(testDbPath, 'invalid database content');
      
      const corruptedDb = new DatabaseManager(testDbPath);
      
      await expect(corruptedDb.initialize()).rejects.toThrow();
    });
  });
});