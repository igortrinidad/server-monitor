import { DiskUsage } from '../types';
export declare class DiskMonitor {
    private diskPaths;
    constructor(diskPaths?: string[]);
    getDiskUsage(): Promise<DiskUsage>;
    private getUnixDiskUsage;
    private getWindowsDiskUsage;
    private getTopFolders;
    private getMacOSMockFolders;
    private parseFolderOutput;
    private parseSize;
}
//# sourceMappingURL=disk.d.ts.map