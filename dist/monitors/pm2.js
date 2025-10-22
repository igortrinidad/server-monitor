"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PM2Monitor = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PM2Monitor {
    async getPM2Processes() {
        try {
            // Check if PM2 is available
            await execAsync('which pm2');
            const { stdout } = await execAsync('pm2 jlist');
            const processes = JSON.parse(stdout);
            return processes.map((proc) => ({
                name: proc.name || '',
                pid: proc.pid || 0,
                status: proc.pm2_env?.status || 'unknown',
                cpu: proc.monit?.cpu || 0,
                memory: proc.monit?.memory || 0,
                uptime: this.formatUptime(proc.pm2_env?.pm_uptime || 0),
                restarts: proc.pm2_env?.restart_time || 0
            }));
        }
        catch (error) {
            console.error('Error getting PM2 processes (PM2 might not be installed):', error);
            return [];
        }
    }
    async getPM2Logs(appName, lines = 100) {
        try {
            const command = appName
                ? `pm2 logs ${appName} --lines ${lines} --nostream`
                : `pm2 logs --lines ${lines} --nostream`;
            const { stdout } = await execAsync(command);
            return stdout;
        }
        catch (error) {
            console.error('Error getting PM2 logs:', error);
            return '';
        }
    }
    formatUptime(startTime) {
        if (!startTime)
            return '0s';
        const now = Date.now();
        const uptimeMs = now - startTime;
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ${hours % 24}h`;
        if (hours > 0)
            return `${hours}h ${minutes % 60}m`;
        if (minutes > 0)
            return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}
exports.PM2Monitor = PM2Monitor;
//# sourceMappingURL=pm2.js.map