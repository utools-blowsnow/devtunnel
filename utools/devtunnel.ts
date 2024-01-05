import {
    Tunnel,
    TunnelAccessControlEntryType,
    TunnelAccessScopes, TunnelConnectionMode,
    TunnelPort, TunnelProtocol
} from "@microsoft/dev-tunnels-contracts";
import {ManagementApiVersions, TunnelManagementHttpClient} from "./devtunnel/management";
import {TunnelRelayTunnelHost} from './devtunnel/connections';

const {exec, spawn} = require('child_process');

const userAgent = 'test-connection/1.0';


const CHINESE_CLUSTERS = {
    'auc1': '澳大利亚中部',
    'aue': '澳大利亚东部',
    'brs': '巴西南部',
    'inc1': '印度中部',
    'use': '美国东部',
    'use2': '美国东部2',
    'eun1': '北欧',
    'asse': '东南亚',
    'uks1': '英国南部',
    'euw': '西欧',
    'usw2': '美国西部2',
    'usw3': '美国西部3',
}

export class DevtunnelNoLoginError extends Error {
    constructor(message) {
        super(message);
        this.name = "DevtunnelNoLoginError";
    }
}

export enum LoginPlatformEnum {
    Github = "-g",
    GithubCode = "-g -d",

    AAD = "-a",
    AADCode = "-a -d",
}

export class DevtunnelHelp {
    private _token = null;
    private _devtunnelPath = null;

    constructor(devtunnelPath: any) {
        this._devtunnelPath = devtunnelPath;
    }

    private getTunnelManagementHttpClient(): TunnelManagementHttpClient {
        let tunnelManagementClient = new TunnelManagementHttpClient(
            userAgent,
            ManagementApiVersions.Version20230927preview,
            // Example: "github <gh-token>" or "Bearer <aad-token>"
            this.getToken
        );

        tunnelManagementClient.trace = function (msg) {
            console.log(msg);
        }

        return tunnelManagementClient;
    }

    public async login(platform: LoginPlatformEnum) {
        const that = this;
        that._token = null;
        return new Promise((resolve, reject) => {
            // 登陆
            exec(`C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WinGet\\Links\\devtunnel.exe user login ` + platform, async (error, stdout, stderr) => {
                console.log(stdout);
                if (stdout.includes("Logged in")) {
                    // 重新获取登陆信息
                    resolve(await that.getToken());
                } else {
                    reject(new Error('登陆失败'));
                }
            })
        })
    }

    private async getToken(): Promise<any> {
        if (this._token) {
            return this._token;
        }
        const cmd = `C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WinGet\\Links\\devtunnel.exe user show -v`;
        const that = this;
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (stdout.includes("Logged in as")) {
                    // 正则匹配 Logged in as imblowsnow using GitHub.
                    if (stdout.match(/Logged in as (.*) using GitHub\./)) {
                        console.log('Logined as github');
                        // UserId: [\w]+\n(.*?)\n
                        that._token = 'github ' + stdout.match(/UserId:[^\n]+\n([^\n]+)\n/)[1].trim();
                        resolve(this._token);
                    } else if (stdout.match(/Logged in as (.*) using Microsoft\./)) {
                        console.log('Logined as azure');
                        // PUID:[\s\S]+\n(.*?)\n
                        that._token = 'Bearer ' + stdout.match(/PUID:[^\n]+\n([^\n]+)\n/)[1].trim();
                        resolve(this._token);
                    }
                } else {
                    reject(new DevtunnelNoLoginError('未登陆'));
                }
            })
        })
    }

    // userlimits
    async userlimits() {
        try {
            let tunnelManagementClient: any = this.getTunnelManagementHttpClient();
            return (await tunnelManagementClient.sendRequest('GET', 'asse', '/userlimits'))[0];
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

    // 获取 clusterId 地区
    async getClusters() {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();
            let clusters = await tunnelManagementClient.listClusters();
            return clusters.map((cluster) => {
                return {
                    ...cluster,
                    label: CHINESE_CLUSTERS[cluster.clusterId] || cluster.clusterId
                }
            })
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

    getTunnels() {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();


            return tunnelManagementClient.listTunnels(null, null, {
                includePorts: true,
            });
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

    async createTunnel(tunnelId, clusterId, ports: TunnelPort[]) {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();
            let tunnelAccessControlEntry = {
                type: TunnelAccessControlEntryType.Anonymous,
                subjects: [],
                scopes: [TunnelAccessScopes.Host, TunnelAccessScopes.Connect],
            };

            const tunnel = {
                tunnelId: tunnelId,
                clusterId: clusterId,
                // name: 'imbload',
                ports: ports,
                accessControl: {
                    entries: [tunnelAccessControlEntry],
                }
            };

            let tunnelRequestOptions = {
                tokenScopes: [TunnelAccessScopes.Host, TunnelAccessScopes.Connect],
                includePorts: true,
            };

            let tunnelInstance = await tunnelManagementClient.createTunnel(tunnel, tunnelRequestOptions);


            if (!tunnelInstance.endpoints || tunnelInstance.endpoints.length === 0) {
                await tunnelManagementClient.updateTunnelEndpoint(tunnelInstance, {
                    id: Math.random().toString(36).substring(7),
                    hostId: Math.random().toString(36).substring(7),
                    connectionMode: TunnelConnectionMode.TunnelRelay,
                })
            }

            return tunnelInstance;
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

    // 更新映射通道
    async updateTunnel(tunnelId, clusterId, ports: TunnelPort[]) {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();
            let tunnelInstance = await tunnelManagementClient.updateTunnel({
                clusterId: clusterId,
                tunnelId: tunnelId,
            })

            tunnelInstance = await tunnelManagementClient.getTunnel(tunnelInstance, {
                includePorts: true,
            });

            let deletePorts = tunnelInstance.ports.filter((port) => {
                return !ports.find((p) => {
                    return p.portNumber === port.portNumber
                })
            })
            let addPorts = ports.filter((port) => {
                return !tunnelInstance.ports.find((p) => {
                    return p.portNumber === port.portNumber
                })
            })

            if (deletePorts.length > 0) {
                await tunnelManagementClient.deleteTunnelPort(tunnelInstance, deletePorts[0].portNumber);
            }

            if (addPorts.length > 0) {
                await tunnelManagementClient.createTunnelPort(tunnelInstance, addPorts[0]);
            }

            if (!tunnelInstance.endpoints || tunnelInstance.endpoints.length === 0) {
                await tunnelManagementClient.updateTunnelEndpoint(tunnelInstance, {
                    id: Math.random().toString(36).substring(7),
                    hostId: Math.random().toString(36).substring(7),
                    connectionMode: TunnelConnectionMode.TunnelRelay,
                })
            }

            return tunnelInstance;
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }


    async startTunnel(tunnelId, clusterId) {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();

            let tunnelInstance = await tunnelManagementClient.getTunnel({
                clusterId: clusterId,
                tunnelId: tunnelId,
            }, {
                // TunnelAccessScopes
                tokenScopes: [TunnelAccessScopes.Host, TunnelAccessScopes.Connect],
                includePorts: true,
            });

            let host = new TunnelRelayTunnelHost(tunnelManagementClient);

            host.trace = (level, eventId, msg, err) => {
                console.log('[' + tunnelId + ']', level, eventId, msg, err);
            }

            await host.connect(<Tunnel>tunnelInstance);

            return tunnelInstance;
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

}
