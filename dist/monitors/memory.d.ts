import { MemoryUsage } from '../types';
export declare class MemoryMonitor {
    getMemoryUsage(): Promise<MemoryUsage>;
    private getTopMemoryProcesses;
    private parseProcessOutput;
}
//# sourceMappingURL=memory.d.ts.map