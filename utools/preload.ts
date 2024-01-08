import logger from "./preload/logger";
import {DevtunnelHelp, DevtunnelNoLoginError, LoginPlatformEnum} from "./preload/devtunnel";
const axios = require('axios');
const os = require('os');
const fs = require('fs');

window['versions'] = {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
}

async function downloadByGithub(githubPath, filePath, options = {}) {
    return await Promise.race([
        axios.get("https://ghps.cc/https://github.com/" + githubPath + "/blob/master/" + filePath, options),
        axios.get("https://hub.gitmirror.com/https://github.com/" + githubPath + "/blob/master/" + filePath, options)
    ]);
}

async function downloadAndSaveFiles(prefixPath, files = {}, savePath) {
    let promises = [];
    for (const githubFilePath of Object.keys(files)) {
        promises.push(downloadByGithub(prefixPath, githubFilePath, {
            responseType: "arraybuffer"
        }).then((response) => {
            let data = response.data;
            let buffer = Buffer.from(data);
            console.log("downloaded", savePath + "/" + files[githubFilePath], buffer.length);
            // 保存到本地
            fs.writeFileSync(savePath + "/" + files[githubFilePath], buffer);
        }))
    }
    return Promise.all(promises);
}

const baseGithubPath = "utools-blowsnow/devtunnel"
let devtunnelHelpInstance = null;

window.mutils = {

    binPath: () => {
        let binPath = os.homedir() + "\\devtunnel";
        if (!fs.existsSync(binPath)) {
            fs.mkdirSync(binPath);
        }
        return binPath;
    },

    // 初始化bin数据
    async getDevtunnelPath(callback=null) {
        let binPath = this.binPath();

        let binList = fs.readdirSync(binPath);
        if (!binList.includes("devtunnel.exe")) {
            callback && callback("未找到Devtunnel，自动下载 devtunnel.exe");

            try {
                await downloadAndSaveFiles(baseGithubPath, {
                    "/other/devtunnel.exe": "devtunnel.exe"
                }, binPath);
            }catch (e) {
                throw new Error("下载失败: 请自行下载devtunnel.exe，放到" + binPath + "目录下");
            }

            console.log("未找到Devtunnel，自动下载 devtunnel.exe");

            binList = fs.readdirSync(binPath);

            if (!binList.includes("devtunnel.exe")) {
                callback && callback("下载失败: 请自行下载devtunnel.exe，放到" + binPath + "目录下");
                throw new Error("下载失败: 请自行下载devtunnel.exe，放到" + binPath + "目录下");
            }else{
                callback && callback("下载成功 devtunnel.exe");
            }
        }

        console.log("binList", binPath, binList);

        return Promise.resolve(binPath + "\\" + "devtunnel.exe");
    },

    async checkDevtunnelPath(filePath): Promise<boolean> {
        console.log("checkDevtunnelPath", fs.existsSync(filePath));
        return fs.existsSync(filePath);
    },

    async getDevtunnelHelp(devtunnelPath= null, downloadCallback=null): Promise<any> {
        if (devtunnelHelpInstance) {
            return devtunnelHelpInstance;
        }
        if (devtunnelPath && !await this.checkDevtunnelPath(devtunnelPath)){
            devtunnelPath = null;
        }
        if (!devtunnelPath){
            devtunnelPath = await this.getDevtunnelPath(downloadCallback);
            logger.info("[devtunnel]", "自动获取devtunnel.exe路径", devtunnelPath);
        }else{
            logger.info("[devtunnel]", "从配置中读取devtunnel.exe路径" , devtunnelPath);
        }
        devtunnelHelpInstance = new DevtunnelHelp(devtunnelPath);
        return devtunnelHelpInstance;
    },


    setLoggerListener(listener: Function) {
        logger.setListener(listener);
    },
}
