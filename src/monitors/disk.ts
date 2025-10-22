import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { DiskUsage, FolderInfo } from '../types';

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

    const percentage = (diskInfo.used / diskInfo.total) * 100;
    const topFolders = await this.getTopFolders();

    return {
      total: diskInfo.total,
      used: diskInfo.used,
      free: diskInfo.free,
      percentage: Math.round(percentage * 100) / 100,
      topFolders
    };
  }

  private async getUnixDiskUsage(): Promise<{ total: number; used: number; free: number }> {
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      if (parts.length >= 4) {
        const total = this.parseSize(parts[1]);
        const used = this.parseSize(parts[2]);
        const free = this.parseSize(parts[3]);
        
        return { total, used, free };
      }
    } catch (error) {
      console.error('Error getting Unix disk usage:', error);
    }

    return { total: 0, used: 0, free: 0 };
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
    }

    return { total: 0, used: 0, free: 0 };
  }

  private async getTopFolders(): Promise<FolderInfo[]> {
    try {
      const platform = os.platform();
      let command: string;

      if (platform === 'darwin' || platform === 'linux') {
        // Unix-like systems
        command = 'du -sh /* 2>/dev/null | sort -hr | head -20';
      } else if (platform === 'win32') {
        // Windows
        command = 'dir C:\\ /s /-c /q | findstr /e "bytes"';
      } else {
        return [];
      }

      const { stdout } = await execAsync(command);
      return this.parseFolderOutput(stdout, platform);
    } catch (error) {
      console.error('Error getting top folders:', error);
      return [];
    }
  }

  private parseFolderOutput(output: string, platform: string): FolderInfo[] {
    const lines = output.trim().split('\n');
    const folders: FolderInfo[] = [];

    if (platform === 'win32') {
      // Windows parsing (simplified)
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          folders.push({
            path: parts[parts.length - 1] || '',
            size: parseInt(parts[parts.length - 2]?.replace(/,/g, '')) || 0,
            percentage: 0 // Will be calculated later
          });
        }
      });
    } else {
      // Unix-like systems
      lines.forEach(line => {
        const parts = line.trim().split('\t');
        if (parts.length >= 2) {
          folders.push({
            path: parts[1] || '',
            size: this.parseSize(parts[0] || '0'),
            percentage: 0 // Will be calculated later
          });
        }
      });
    }

    // Calculate percentages
    const totalSize = folders.reduce((sum, folder) => sum + folder.size, 0);
    folders.forEach(folder => {
      folder.percentage = totalSize > 0 ? (folder.size / totalSize) * 100 : 0;
    });

    return folders.slice(0, 20);
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)/i);
    if (match) {
      const size = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      return size * (units[unit] || 1);
    }

    return parseInt(sizeStr) || 0;
  }
}