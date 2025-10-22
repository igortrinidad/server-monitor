import { CpuUsage } from '../types';
export declare class CpuMonitor {
    private previousCpuTimes;
    getCpuUsage(): Promise<CpuUsage>;
    private calculateCpuPercentage;
    private getTopCpuProcesses;
    private parseProcessOutput;
}
//# sourceMappingURL=cpu.d.ts.map