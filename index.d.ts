import {DevtunnelHelp} from "./utools/devtunnel";

export interface ProcessVersions {
    node: () => string;
    chrome: () => string;
    electron: () => string;
}


export interface Mutils {
    binPath: () => string;

    getDevtunnelPath: () => Promise<string>;

    donwloadDevtunnel(downloadUrl, downloadPath, progress?): Promise<string>;

    checkDevtunnelPath(filePath): Promise<boolean>;

    getDevtunnelHelp: (devtunnelPath) => Promise<DevtunnelHelp>;

    setLoggerListener(listener: Function): void;
}


declare global {
    interface Window {
        versions: ProcessVersions;
        mutils: Mutils;
    }
}
