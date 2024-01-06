import {
    Tunnel,
    TunnelAccessControlEntryType,
    TunnelAccessScopes, TunnelConnectionMode,
    TunnelPort, TunnelProtocol
} from "@microsoft/dev-tunnels-contracts";
import {ManagementApiVersions, TunnelManagementHttpClient} from "@microsoft/dev-tunnels-management";
import {TunnelRelayTunnelHost} from './devtunnel/connections/tunnelRelayTunnelHost';
import logger from './logger'

const {exec, spawn} = require('child_process');
const mutexify = require('mutexify/promise');
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

const lock = mutexify();
const lockTimeout = async function (ms) {
    let release = await lock();
    setTimeout(() => {
        if (lock.locked) {
            release();
            console.log('lockTimeout release');
        }
    }, ms);
    return release;
}
export class DevtunnelHelp {
    private _token = null;
    private _devtunnelPath = null;
    private _hosts = {};

    constructor(devtunnelPath: any) {
        this._devtunnelPath = devtunnelPath;
    }

    initToken() {
        return this.getToken()
    }

    private getTunnelManagementHttpClient(): TunnelManagementHttpClient {
        let tunnelManagementClient = new TunnelManagementHttpClient(
            userAgent,
            ManagementApiVersions.Version20230927preview,
            // Example: "github <gh-token>" or "Bearer <aad-token>"
            () => this.getToken()
        );

        tunnelManagementClient.trace = function (msg) {
            logger.trace('[devtunnel]', 'TunnelManagementHttpClient', msg);
        }

        return tunnelManagementClient;
    }

    public async login(platformParams: LoginPlatformEnum) {
        const that = this;
        that._token = null;
        return new Promise((resolve, reject) => {
            logger.trace('[devtunnel]', 'login', this._devtunnelPath + ` user login ` + platformParams);
            // 登陆
            exec(this._devtunnelPath + ` user login ` + platformParams, async (error, stdout, stderr) => {
                logger.trace('[devtunnel]', 'login', 'stdout', stdout);
                if (error) {
                    reject(error);
                }
                if (stdout.includes("Logged in")) {
                    logger.info('[devtunnel]', 'login', '登陆成功')
                    // 重新获取登陆信息
                    resolve(await that.getToken());
                } else {
                    logger.error('[devtunnel]', 'login', '登陆失败')
                    reject(new Error('登陆失败'));
                }
            })
        })
    }

    public async isLogin() {
        return !!this._token;
    }

    private async getToken() {
        if (this._token) {
            return this._token;
        }
        const lockRelease = await lockTimeout(5000);
        console.log('lockTimeout', lock.locked);
        if (this._token) {
            lockRelease();
            return this._token;
        }
        const cmd = this._devtunnelPath + ` user show -v`;
        const that = this;
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    logger.error('[devtunnel]', 'getToken', error)
                    reject(error);
                }
                logger.trace('[devtunnel]', 'getToken', 'stdout', stdout)
                if (stdout.includes("Logged in as")) {
                    // 正则匹配 Logged in as imblowsnow using GitHub.
                    if (stdout.match(/Logged in as (.*) using GitHub\./)) {
                        logger.info('[devtunnel]', 'getToken', 'Logined as github');
                        // UserId: [\w]+\n(.*?)\n
                        that._token = 'github ' + stdout.match(/UserId:[^\n]+\n([^\n]+)\n/)[1].trim();
                        resolve(this._token);
                    } else if (stdout.match(/Logged in as (.*) using Microsoft\./)) {
                        logger.info('[devtunnel]', 'getToken', 'Logined as azure');
                        // PUID:[\s\S]+\n(.*?)\n
                        that._token = 'Bearer ' + stdout.match(/PUID:[^\n]+\n([^\n]+)\n/)[1].trim();
                        resolve(this._token);
                    }
                } else {
                    logger.error('[devtunnel]', 'getToken', '未登陆')
                    reject(new DevtunnelNoLoginError('未登陆'));
                }
            })
        }).finally(() => {
            lockRelease();
            console.log('lockRelease');
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

    getClusterChineseName(clusterId) {
        return CHINESE_CLUSTERS[clusterId] || clusterId;
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

    async createTunnel(tunnel, ports: TunnelPort[]) {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();
            let tunnelAccessControlEntry = {
                type: TunnelAccessControlEntryType.Anonymous,
                subjects: [],
                scopes: [TunnelAccessScopes.Host, TunnelAccessScopes.Connect],
            };

            const createTunnel = {
                tunnelId: tunnel.tunnelId,
                clusterId: tunnel.clusterId,
                description: tunnel.description,
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

            let tunnelInstance = await tunnelManagementClient.createTunnel(createTunnel, tunnelRequestOptions);


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
    async updateTunnel(tunnel) {
        try {
            let ports = tunnel.ports;
            let tunnelManagementClient = this.getTunnelManagementHttpClient();
            let tunnelInstance = await tunnelManagementClient.updateTunnel({
                clusterId: tunnel.clusterId,
                tunnelId: tunnel.tunnelId,
                description: tunnel.description,
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
                // Error = "error",
                //     Warning = "warning",
                //     Info = "info",
                //     Verbose = "verbose"
                let mlevel = 'info';
                if (level === 'error') {
                    mlevel = 'error';
                } else if (level === 'warning') {
                    mlevel = 'warn';
                } else if (level === 'verbose') {
                    mlevel = 'trace';
                }
                logger[mlevel]('[devtunnel]', '[' + tunnelId + ']', '[' + eventId + ']', msg);
            }

            await host.connect(<Tunnel>tunnelInstance);

            this._hosts[tunnelId] = host;

            return tunnelInstance;
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

    isStartTunnel(tunnelId) {
        return !!this._hosts[tunnelId];
    }


    async stopTunnel(tunnelId) {
        if (this._hosts[tunnelId]) {
            await ((this._hosts[tunnelId] as TunnelRelayTunnelHost).dispose());
            delete this._hosts[tunnelId];
        }
    }

    deleteTunnel(tunnelId, clusterId) {
        let tunnelManagementClient = this.getTunnelManagementHttpClient();

        return tunnelManagementClient.deleteTunnel({
            clusterId: clusterId,
            tunnelId: tunnelId,
        });
    }

}
