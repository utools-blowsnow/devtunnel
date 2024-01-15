const {TunnelManagementHttpClient, ManagementApiVersions} = require('@microsoft/dev-tunnels-management');
const {Tunnel,TunnelPort, TunnelProtocol} = require('@microsoft/dev-tunnels-contracts');
const {exec, spawn} = require('child_process');
const userAgent = 'test-connection/1.0';
import {TunnelRelayTunnelHost} from './devtunnel/connections/tunnelRelayTunnelHost';
import logger from './logger'


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
    GithubCode = "-gd",

    AAD = "-a",
    AADCode = "-ad",
}

enum TunnelAccessScopes {
    /**
     * Allows creating tunnels. This scope is valid only in policies at the global,
     * domain, or organization level; it is not relevant to an already-created tunnel or
     * tunnel port. (Creation of ports requires "manage" or "host" access to the tunnel.)
     */
    Create = "create",
    /**
     * Allows management operations on tunnels and tunnel ports.
     */
    Manage = "manage",
    /**
     * Allows management operations on all ports of a tunnel, but does not allow updating
     * any other tunnel properties or deleting the tunnel.
     */
    ManagePorts = "manage:ports",
    /**
     * Allows accepting connections on tunnels as a host. Includes access to update tunnel
     * endpoints and ports.
     */
    Host = "host",
    /**
     * Allows inspecting tunnel connection activity and data.
     */
    Inspect = "inspect",
    /**
     * Allows connecting to tunnels or ports as a client.
     */
    Connect = "connect"
}

enum TunnelAccessControlEntryType {
    /**
     * Uninitialized access control entry type.
     */
    None = "None",
    /**
     * The access control entry refers to all anonymous users.
     */
    Anonymous = "Anonymous",
    /**
     * The access control entry is a list of user IDs that are allowed (or denied) access.
     */
    Users = "Users",
    /**
     * The access control entry is a list of groups IDs that are allowed (or denied)
     * access.
     */
    Groups = "Groups",
    /**
     * The access control entry is a list of organization IDs that are allowed (or denied)
     * access.
     *
     * All users in the organizations are allowed (or denied) access, unless overridden by
     * following group or user rules.
     */
    Organizations = "Organizations",
    /**
     * The access control entry is a list of repositories. Users are allowed access to the
     * tunnel if they have access to the repo.
     */
    Repositories = "Repositories",
    /**
     * The access control entry is a list of public keys. Users are allowed access if they
     * can authenticate using a private key corresponding to one of the public keys.
     */
    PublicKeys = "PublicKeys",
    /**
     * The access control entry is a list of IP address ranges that are allowed (or
     * denied) access to the tunnel. Ranges can be IPv4, IPv6, or Azure service tags.
     */
    IPAddressRanges = "IPAddressRanges"
}

export class DevtunnelHelp {
    private _token = null;
    private _devtunnelPath = null;
    private _hosts = {};

    constructor(devtunnelPath: any) {
        this._devtunnelPath = devtunnelPath;
    }


    public getDevTunnelPath() {
        return this._devtunnelPath;
    }

    public setDevTunnelPath(devtunnelPath) {
        this._devtunnelPath = devtunnelPath;
    }

    public initToken() {
        return this.getToken()
    }

    private getTunnelManagementHttpClient(): any {
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

    public async login(platformParams: LoginPlatformEnum,callbackCode=null) {
        const that = this;
        that._token = null;
        return new Promise((resolve, reject) => {
            logger.trace('[devtunnel]', 'login', this._devtunnelPath + ` user login ` + platformParams);

            let i = spawn(this._devtunnelPath, ['user', 'login', platformParams], {

            })
            i.stdout.on('data', async (stdout) => {
                logger.trace('[devtunnel]', 'login', 'stdout', stdout.toString());
                callbackCode && callbackCode(stdout.toString());

                if (stdout.toString().includes("Logged in")) {
                    logger.info('[devtunnel]', 'login', '登陆成功')
                    // 重新获取登陆信息
                    resolve(await that.getToken());
                }
            })
            i.stderr.on('data', async (stdout) => {
                logger.trace('[devtunnel]', 'login', 'stderr', stdout.toString());
                callbackCode && callbackCode(stdout.toString());

                if (stdout.toString().includes("Logged in")) {
                    logger.info('[devtunnel]', 'login', '登陆成功')
                    // 重新获取登陆信息
                    resolve(await that.getToken());
                }
            })

            i.on('error', (code) => {
                logger.error('[devtunnel]', 'login', '登陆失败')
                reject(new Error('登陆失败'));
            });

        })
    }

    public async isLogin() {
        return !!this._token;
    }

    private async getToken() {
        if (this._token) {
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

    async getTunnels() {
        try {
            let tunnelManagementClient = this.getTunnelManagementHttpClient();

            let tunnels = await tunnelManagementClient.listTunnels(null, null, {
                includePorts: true,
            });

            for (const tunnel of tunnels) {
                if (tunnel.ports.length === 0){
                    tunnel.ports = await tunnelManagementClient.listTunnelPorts(tunnel)
                }
            }
            return tunnels;
        } catch (e) {
            if (e.response && e.response.status === 401) {
                throw new DevtunnelNoLoginError('未登陆');
            } else {
                throw e;
            }
        }
    }

    async createTunnel(tunnel, ports: any[]) {
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
                    connectionMode: "TunnelRelay",
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

            // let deletePorts = tunnelInstance.ports.filter((port) => {
            //     return !ports.find((p) => {
            //         return p.portNumber === port.portNumber
            //     })
            // })
            for (const deletePort of tunnelInstance.ports) {
                await tunnelManagementClient.deleteTunnelPort(tunnelInstance, deletePort.portNumber);
            }

            for (const port of ports) {
                await tunnelManagementClient.createOrUpdateTunnelPort(tunnelInstance, port);
            }

            if (!tunnelInstance.endpoints || tunnelInstance.endpoints.length === 0) {
                await tunnelManagementClient.updateTunnelEndpoint(tunnelInstance, {
                    id: Math.random().toString(36).substring(7),
                    hostId: Math.random().toString(36).substring(7),
                    connectionMode: "TunnelRelay",
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


    async startTunnel(tunnelId, clusterId, closeCallback = null) {
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
                    console.error(err)
                } else if (level === 'warning') {
                    mlevel = 'warn';
                } else if (level === 'verbose') {
                    mlevel = 'trace';
                }
                logger[mlevel]('[devtunnel]', '[' + tunnelId + ']', '[' + eventId + ']', msg);
            }



            await host.connect(<any>tunnelInstance);

            this._hosts[tunnelId] = host;

            let timer = setInterval(() => {
                if (host.isDisposed){
                    clearInterval(timer);
                    delete this._hosts[tunnelId];

                    closeCallback && closeCallback();
                }
            }, 1000)

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
