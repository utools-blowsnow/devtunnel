import axios from 'axios';
import {DevtunnelHelp} from "./devtunnel";

const os = require('os');
const fs = require('fs');

window['versions'] = {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
}

async function downloadByGithub(githubUrl, options = {}) {
    return await Promise.race([
        axios.get("https://cdn.jsdelivr.net/gh/" + githubUrl, options),
        axios.get("https://ghps.cc/https://github.com/" + githubUrl, options),
        axios.get("https://hub.gitmirror.com/https://github.com/" + githubUrl, options)
    ]);
}

async function downloadAndSaveFiles(prefixPath, files = [], savePath) {
    let promises = [];
    for (const fileName of files) {
        promises.push(downloadByGithub(prefixPath + "/" + fileName, {
            responseType: "arraybuffer"
        }).then((response) => {
            let data = response.data;
            let buffer = Buffer.from(data);
            console.log("downloaded", savePath + "/" + fileName, buffer.length);
            // 保存到本地
            fs.writeFileSync(savePath + "/" + fileName, buffer);
        }))
    }
    return Promise.all(promises);
}

const baseGithubPath = "utools-blowsnow/image-enlarge"

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
            await downloadAndSaveFiles(baseGithubPath + `/other`, [
                "devtunnel.exe"
            ], binPath);

            binList = fs.readdirSync(binPath);
        }

        console.log("binList", binPath, binList);

        return Promise.resolve(binPath + "/" + "devtunnel.exe");
    },

    getDevtunnelHelp(): Promise<DevtunnelHelp> {
        return new Promise((resolve, reject) => {
            this.getDevtunnelPath().then((devtunnelPath) => {
                resolve(new DevtunnelHelp(devtunnelPath));
            })
        });
    },
}


window.mutils.getDevtunnelHelp().then((devtunnelHelp) => {
    console.log("devtunnelHelp", devtunnelHelp);
});
