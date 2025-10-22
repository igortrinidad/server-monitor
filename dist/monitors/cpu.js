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
exports.CpuMonitor = void 0;
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class CpuMonitor {
    constructor() {
        this.previousCpuTimes = [];
    }
    async getCpuUsage() {
        const cpuPercentage = await this.calculateCpuPercentage();
        const loadAverage = os.loadavg();
        const topProcesses = await this.getTopCpuProcesses();
        return {
            percentage: Math.round(cpuPercentage * 100) / 100,
            loadAverage,
            topProcesses
        };
    }
    async calculateCpuPercentage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        const currentTimes = [totalIdle, totalTick];
        if (this.previousCpuTimes.length > 0) {
            const idleDifference = currentTimes[0] - this.previousCpuTimes[0];
            const totalDifference = currentTimes[1] - this.previousCpuTimes[1];
            const cpuPercentage = 100 - (100 * idleDifference / totalDifference);
            this.previousCpuTimes = currentTimes;
            return cpuPercentage;
        }
        this.previousCpuTimes = currentTimes;
        return 0;
    }
    async getTopCpuProcesses() {
        try {
            const platform = os.platform();
            let command;
            if (platform === 'darwin' || platform === 'linux') {
                // macOS and Linux
                command = 'ps -eo pid,comm,%cpu,%mem,command --sort=-%cpu | head -21';
            }
            else if (platform === 'win32') {
                // Windows
                command = 'wmic process get ProcessId,Name,WorkingSetSize,PageFileUsage,CommandLine /format:csv | findstr /v "^$"';
            }
            else {
                return [];
            }
            const { stdout } = await execAsync(command);
            return this.parseProcessOutput(stdout, platform);
        }
        catch (error) {
            console.error('Error getting top CPU processes:', error);
            return [];
        }
    }
    parseProcessOutput(output, platform) {
        const lines = output.trim().split('\n');
        const processes = [];
        if (platform === 'win32') {
            // Windows parsing (simplified)
            for (let i = 1; i < Math.min(lines.length, 21); i++) {
                const parts = lines[i].split(',');
                if (parts.length >= 5) {
                    processes.push({
                        pid: parseInt(parts[3]) || 0,
                        name: parts[1] || '',
                        memoryUsage: parseInt(parts[2]) || 0,
                        cpuUsage: 0, // Not easily available in this command for Windows
                        command: parts[4] || ''
                    });
                }
            }
        }
        else {
            // Unix-like systems
            for (let i = 1; i < Math.min(lines.length, 21); i++) {
                const parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 5) {
                    processes.push({
                        pid: parseInt(parts[0]) || 0,
                        name: parts[1] || '',
                        memoryUsage: parseFloat(parts[3]) || 0,
                        cpuUsage: parseFloat(parts[2]) || 0,
                        command: parts.slice(4).join(' ') || ''
                    });
                }
            }
        }
        return processes.slice(0, 20);
    }
}
exports.CpuMonitor = CpuMonitor;
//# sourceMappingURL=cpu.js.map