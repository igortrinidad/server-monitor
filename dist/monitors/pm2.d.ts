import { PM2ProcessInfo } from '../types';
export declare class PM2Monitor {
    getPM2Processes(): Promise<PM2ProcessInfo[]>;
    getPM2Logs(appName?: string, lines?: number): Promise<string>;
    private formatUptime;
}
//# sourceMappingURL=pm2.d.ts.map