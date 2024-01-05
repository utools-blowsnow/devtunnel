import {DevtunnelHelp} from "./utools/devtunnel";

export interface ProcessVersions {
    node: () => string;
    chrome: () => string;
    electron: () => string;
}


export interface Mutils {
    binPath: () => string;

    getDevtunnelPath: () => Promise<string>;


    getDevtunnelHelp: () => Promise<DevtunnelHelp>;
}


declare global {
    interface Window {
        versions: ProcessVersions;
        mutils: Mutils;
    }
}
