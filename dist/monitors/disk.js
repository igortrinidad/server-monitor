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
exports.DiskMonitor = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DiskMonitor {
    constructor(diskPaths = ['/']) {
        this.diskPaths = diskPaths;
    }
    async getDiskUsage() {
        const platform = os.platform();
        let diskInfo;
        if (platform === 'win32') {
            diskInfo = await this.getWindowsDiskUsage();
        }
        else {
            diskInfo = await this.getUnixDiskUsage();
        }
        const percentage = diskInfo.total > 0 ? (diskInfo.used / diskInfo.total) * 100 : 0;
        return {
            total: diskInfo.total,
            used: diskInfo.used,
            free: diskInfo.free,
            percentage: Math.round(percentage * 100) / 100
        };
    }
    async getUnixDiskUsage() {
        try {
            const { stdout } = await execAsync('df -B1 / | tail -1');
            const parts = stdout.trim().split(/\s+/);
            if (parts.length >= 4) {
                const total = parseInt(parts[1]) || 0;
                const used = parseInt(parts[2]) || 0;
                const free = parseInt(parts[3]) || 0;
                // Validate that we got reasonable numbers
                if (total > 0) {
                    return { total, used, free };
                }
            }
            throw new Error(`Invalid df output format: ${stdout}`);
        }
        catch (error) {
            console.error('Error getting Unix disk usage:', error);
            return { total: 0, used: 0, free: 0 };
        }
    }
    async getWindowsDiskUsage() {
        try {
            const { stdout } = await execAsync('wmic logicaldisk where caption="C:" get size,freespace /value');
            const lines = stdout.trim().split('\n');
            let total = 0;
            let free = 0;
            lines.forEach(line => {
                if (line.startsWith('FreeSpace=')) {
                    free = parseInt(line.split('=')[1]) || 0;
                }
                else if (line.startsWith('Size=')) {
                    total = parseInt(line.split('=')[1]) || 0;
                }
            });
            const used = total - free;
            return { total, used, free };
        }
        catch (error) {
            console.error('Error getting Windows disk usage:', error);
            return { total: 0, used: 0, free: 0 };
        }
    }
}
exports.DiskMonitor = DiskMonitor;
//# sourceMappingURL=disk.js.map