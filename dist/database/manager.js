"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
class DatabaseManager {
    constructor(dbPath) {
        this.db = null;
        this.dbPath = dbPath || path.join(process.cwd(), 'server-monitor.db');
    }
    async initialize() {
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
    async createTables() {
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
                }
                else {
                    resolve();
                }
            });
        });
    }
    async insertMetric(type, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const timestamp = new Date().toISOString();
            const dataStr = JSON.stringify(data);
            this.db.run('INSERT INTO metrics (timestamp, type, data) VALUES (?, ?, ?)', [timestamp, type, dataStr], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
        });
    }
    async getMetrics(type, limit, startDate, endDate) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            let query = 'SELECT * FROM metrics';
            const params = [];
            const conditions = [];
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
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    const records = rows.map(row => ({
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
    async getLatestMetric(type) {
        const metrics = await this.getMetrics(type, 1);
        return metrics.length > 0 ? metrics[0] : null;
    }
    async deleteOldMetrics(olderThanDays) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            this.db.run('DELETE FROM metrics WHERE timestamp < ?', [cutoffDate.toISOString()], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes || 0);
                }
            });
        });
    }
    async getMetricsCount(type) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            let query = 'SELECT COUNT(*) as count FROM metrics';
            const params = [];
            if (type) {
                query += ' WHERE type = ?';
                params.push(type);
            }
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row.count || 0);
                }
            });
        });
    }
    async close() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            this.db.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.db = null;
                    resolve();
                }
            });
        });
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=manager.js.map