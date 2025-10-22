import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MemoryUsage, ProcessInfo } from '../types';
import { formatBytes } from '../helpers/formatBytes';

const execAsync = promisify(exec);

export class MemoryMonitor {
  async getMemoryUsage(): Promise<MemoryUsage> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    const topProcesses = await this.getTopMemoryProcesses();

    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentage: Math.round(percentage * 100) / 100,
      formatted_total: formatBytes(totalMemory),
      formatted_used: formatBytes(usedMemory),
      formatted_free: formatBytes(freeMemory),
      topProcesses
    };
  }

  private async getTopMemoryProcesses(): Promise<ProcessInfo[]> {
    try {
      const platform = os.platform();
      let command: string;

      if (platform === 'darwin' || platform === 'linux') {
        // macOS and Linux
        command = 'ps -eo pid,comm,%mem,%cpu,command --sort=-%mem | head -21';
      } else if (platform === 'win32') {
        // Windows
        command = 'wmic process get ProcessId,Name,WorkingSetSize,PageFileUsage,CommandLine /format:csv | findstr /v "^$" | sort /r /k 3';
      } else {
        return [];
      }

      const { stdout } = await execAsync(command);
      return this.parseProcessOutput(stdout, platform);
    } catch (error) {
      console.error('Error getting top memory processes:', error);
      return [];
    }
  }

  private parseProcessOutput(output: string, platform: string): ProcessInfo[] {
    const lines = output.trim().split('\n');
    const processes: ProcessInfo[] = [];

    if (platform === 'win32') {
      // Skip header line for Windows
      for (let i = 1; i < Math.min(lines.length, 21); i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 5) {
          processes.push({
            pid: parseInt(parts[3]) || 0,
            name: parts[1] || '',
            memoryUsage: parseInt(parts[2]) || 0,
            cpuUsage: 0, // Not easily available in this command
            command: parts[4] || ''
          });
        }
      }
    } else {
      // Skip header line for Unix-like systems
      for (let i = 1; i < Math.min(lines.length, 21); i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 5) {
          processes.push({
            pid: parseInt(parts[0]) || 0,
            name: parts[1] || '',
            memoryUsage: parseFloat(parts[2]) || 0,
            cpuUsage: parseFloat(parts[3]) || 0,
            command: parts.slice(4).join(' ') || ''
          });
        }
      }
    }

    return processes.slice(0, 20);
  }
}