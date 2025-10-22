import { DiskUsage } from '../types';
export declare class DiskMonitor {
    private diskPaths;
    constructor(diskPaths?: string[]);
    getDiskUsage(): Promise<DiskUsage>;
    private getUnixDiskUsage;
    private getWindowsDiskUsage;
}
//# sourceMappingURL=disk.d.ts.map