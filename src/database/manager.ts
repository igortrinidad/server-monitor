import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { DatabaseRecord } from '../types';

export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'server-monitor.db');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          data TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_timestamp ON metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_type ON metrics(type);
      `;

      this.db.exec(createTableSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async insertMetric(type: string, data: any): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const timestamp = new Date().toISOString();
      const dataStr = JSON.stringify(data);

      this.db.run(
        'INSERT INTO metrics (timestamp, type, data) VALUES (?, ?, ?)',
        [timestamp, type, dataStr],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async getMetrics(
    type?: string,
    limit?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<DatabaseRecord[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      let query = 'SELECT * FROM metrics';
      const params: any[] = [];
      const conditions: string[] = [];

      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }

      if (startDate) {
        conditions.push('timestamp >= ?');
        params.push(startDate.toISOString());
      }

      if (endDate) {
        conditions.push('timestamp <= ?');
        params.push(endDate.toISOString());
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const records: DatabaseRecord[] = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            type: row.type,
            data: row.data
          }));
          resolve(records);
        }
      });
    });
  }

  async getLatestMetric(type: string): Promise<DatabaseRecord | null> {
    const metrics = await this.getMetrics(type, 1);
    return metrics.length > 0 ? metrics[0] : null;
  }

  async deleteOldMetrics(olderThanDays: number): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      this.db.run(
        'DELETE FROM metrics WHERE timestamp < ?',
        [cutoffDate.toISOString()],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes || 0);
          }
        }
      );
    });
  }

  async getMetricsCount(type?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      let query = 'SELECT COUNT(*) as count FROM metrics';
      const params: any[] = [];

      if (type) {
        query += ' WHERE type = ?';
        params.push(type);
      }

      this.db.get(query, params, (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count || 0);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }
}