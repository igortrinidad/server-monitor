import { exec } from 'child_process';
import { promisify } from 'util';
import { PM2ProcessInfo } from '../types';

const execAsync = promisify(exec);

export class PM2Monitor {
  async getPM2Processes(): Promise<PM2ProcessInfo[]> {
    try {
      // Check if PM2 is available
      await execAsync('which pm2');
      
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      
      return processes.map((proc: any) => ({
        name: proc.name || '',
        pid: proc.pid || 0,
        status: proc.pm2_env?.status || 'unknown',
        cpu: proc.monit?.cpu || 0,
        memory: proc.monit?.memory || 0,
        uptime: this.formatUptime(proc.pm2_env?.pm_uptime || 0),
        restarts: proc.pm2_env?.restart_time || 0
      }));
    } catch (error) {
      console.error('Error getting PM2 processes (PM2 might not be installed):', error);
      return [];
    }
  }

  async getPM2Logs(appName?: string, lines: number = 100): Promise<string> {
    try {
      const command = appName 
        ? `pm2 logs ${appName} --lines ${lines} --nostream`
        : `pm2 logs --lines ${lines} --nostream`;
      
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      console.error('Error getting PM2 logs:', error);
      return '';
    }
  }

  private formatUptime(startTime: number): string {
    if (!startTime) return '0s';
    
    const now = Date.now();
    const uptimeMs = now - startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}