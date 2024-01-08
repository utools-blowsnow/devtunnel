import {DevtunnelHelp} from "./utools/devtunnel";

export interface ProcessVersions {
    node: () => string;
    chrome: () => string;
    electron: () => string;
}


export interface Mutils {
    binPath: () => string;

    getDevtunnelPath: (callback?) => Promise<string>;

    checkDevtunnelPath(filePath): Promise<boolean>;

    getDevtunnelHelp: (devtunnelPath, callback?) => Promise<DevtunnelHelp>;

    setLoggerListener(listener: Function): void;
}


declare global {
    interface Window {
        versions: ProcessVersions;
        mutils: Mutils;
    }
}
