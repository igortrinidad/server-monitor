import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { DiskUsage } from '../types';
import { formatBytes } from '../helpers/formatBytes';

const execAsync = promisify(exec);

export class DiskMonitor {
  private diskPaths: string[];

  constructor(diskPaths: string[] = ['/']) {
    this.diskPaths = diskPaths;
  }

  async getDiskUsage(): Promise<DiskUsage> {
    const platform = os.platform();
    let diskInfo: { total: number; used: number; free: number };

    if (platform === 'win32') {
      diskInfo = await this.getWindowsDiskUsage();
    } else {
      diskInfo = await this.getUnixDiskUsage();
    }

    const percentage = diskInfo.total > 0 ? (diskInfo.used / diskInfo.total) * 100 : 0;

    return {
      total: diskInfo.total,
      used: diskInfo.used,
      free: diskInfo.free,
      percentage: Math.round(percentage * 100) / 100,
      formatted_total: formatBytes(diskInfo.total),
      formatted_used: formatBytes(diskInfo.used),
      formatted_free: formatBytes(diskInfo.free)
    };
  }

  private async getUnixDiskUsage(): Promise<{ total: number; used: number; free: number }> {
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
    } catch (error) {
      console.error('Error getting Unix disk usage:', error);
      return { total: 0, used: 0, free: 0 };
    }
  }

  private async getWindowsDiskUsage(): Promise<{ total: number; used: number; free: number }> {
    try {
      const { stdout } = await execAsync('wmic logicaldisk where caption="C:" get size,freespace /value');
      const lines = stdout.trim().split('\n');
      let total = 0;
      let free = 0;

      lines.forEach(line => {
        if (line.startsWith('FreeSpace=')) {
          free = parseInt(line.split('=')[1]) || 0;
        } else if (line.startsWith('Size=')) {
          total = parseInt(line.split('=')[1]) || 0;
        }
      });

      const used = total - free;
      return { total, used, free };
    } catch (error) {
      console.error('Error getting Windows disk usage:', error);
      return { total: 0, used: 0, free: 0 };
    }
  }
}