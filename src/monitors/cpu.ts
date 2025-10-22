import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CpuUsage, ProcessInfo } from '../types';

const execAsync = promisify(exec);

export class CpuMonitor {
  private previousCpuTimes: number[] = [];

  async getCpuUsage(): Promise<CpuUsage> {
    const cpuPercentage = await this.calculateCpuPercentage();
    const loadAverage = os.loadavg();
    const topProcesses = await this.getTopCpuProcesses();

    return {
      percentage: Math.round(cpuPercentage * 100) / 100,
      loadAverage,
      topProcesses
    };
  }

  private async calculateCpuPercentage(): Promise<number> {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
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

  private async getTopCpuProcesses(): Promise<ProcessInfo[]> {
    try {
      const platform = os.platform();
      let command: string;

      if (platform === 'darwin' || platform === 'linux') {
        // macOS and Linux
        command = 'ps -eo pid,comm,%cpu,%mem,command --sort=-%cpu | head -21';
      } else if (platform === 'win32') {
        // Windows
        command = 'wmic process get ProcessId,Name,WorkingSetSize,PageFileUsage,CommandLine /format:csv | findstr /v "^$"';
      } else {
        return [];
      }

      const { stdout } = await execAsync(command);
      return this.parseProcessOutput(stdout, platform);
    } catch (error) {
      console.error('Error getting top CPU processes:', error);
      return [];
    }
  }

  private parseProcessOutput(output: string, platform: string): ProcessInfo[] {
    const lines = output.trim().split('\n');
    const processes: ProcessInfo[] = [];

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
    } else {
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