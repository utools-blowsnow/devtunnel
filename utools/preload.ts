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
    async getDevtunnelPath() {
        let binPath = this.binPath();

        let binList = fs.readdirSync(binPath);
        if (!binList.includes("devtunnel.exe")) {
            return Promise.reject(new Error("未找到Devtunnel"));
        }

        console.log("binList", binPath, binList);

        return Promise.resolve(binPath + "\\" + "devtunnel.exe");
    },

    async donwloadDevtunnel(downloadUrl, downloadPath, progress=null) {
        try {
            await axios.get(downloadUrl,  {
                responseType: "arraybuffer",
                onDownloadProgress: (progressEvent) => {
                    if (progress) {
                        progress(progressEvent);
                    }
                }
            }).then((response) => {
                let data = response.data;
                let buffer = Buffer.from(data);
                console.log("downloaded", downloadPath, buffer.length);
                // 保存到本地
                fs.writeFileSync(downloadPath, buffer);
            })
        }catch (e) {
            throw new Error("下载失败: 请自行下载devtunnel.exe，放到" + downloadPath + "目录下");
        }

        return Promise.resolve(downloadPath);
    },

    async checkDevtunnelPath(filePath): Promise<boolean> {
        console.log("checkDevtunnelPath", filePath, fs.existsSync(filePath));
        return fs.existsSync(filePath);
    },

    async getDevtunnelHelp(devtunnelPath): Promise<any> {
        if (devtunnelHelpInstance) {
            return devtunnelHelpInstance;
        }
        // if (devtunnelPath && !await this.checkDevtunnelPath(devtunnelPath)){
        //     logger.info("[devtunnel]", "devtunnel未下载", devtunnelPath);
        //     throw new Error("devtunnel.exe路径不存在");
        // }
        devtunnelHelpInstance = new DevtunnelHelp(devtunnelPath);
        return devtunnelHelpInstance;
    },


    setLoggerListener(listener: Function) {
        logger.setListener(listener);
    },
}
