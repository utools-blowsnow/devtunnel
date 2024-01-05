"use strict";
// 您可以在进行窗口交互
// utools文档
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// https://www.u.tools/docs/developer/api.html#%E7%AA%97%E5%8F%A3%E4%BA%A4%E4%BA%92
var axios_1 = require("axios");
var devtunnel_1 = require("./devtunnel");
var os = require('os');
var fs = require('fs');
var child_process = require('child_process');
window['versions'] = {
    node: function () { return process.versions.node; },
    chrome: function () { return process.versions.chrome; },
    electron: function () { return process.versions.electron; }
};
function downloadByGithub(githubUrl, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.race([
                        axios_1["default"].get("https://cdn.jsdelivr.net/gh/" + githubUrl, options),
                        axios_1["default"].get("https://ghps.cc/https://github.com/" + githubUrl, options),
                        axios_1["default"].get("https://hub.gitmirror.com/https://github.com/" + githubUrl, options)
                    ])];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function downloadAndSaveFiles(prefixPath, files, savePath) {
    if (files === void 0) { files = []; }
    return __awaiter(this, void 0, void 0, function () {
        var promises, _loop_1, _i, files_1, fileName;
        return __generator(this, function (_a) {
            promises = [];
            _loop_1 = function (fileName) {
                promises.push(downloadByGithub(prefixPath + "/" + fileName, {
                    responseType: "arraybuffer"
                }).then(function (response) {
                    var data = response.data;
                    var buffer = Buffer.from(data);
                    console.log("downloaded", savePath + "/" + fileName, buffer.length);
                    // 保存到本地
                    fs.writeFileSync(savePath + "/" + fileName, buffer);
                }));
            };
            for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                fileName = files_1[_i];
                _loop_1(fileName);
            }
            return [2 /*return*/, Promise.all(promises)];
        });
    });
}
var baseGithubPath = "utools-blowsnow/image-enlarge";
window['mutils'] = {
    binPath: function () {
        var binPath = os.homedir() + "\\devtunnel\\bin";
        return binPath;
    },
    // 初始化bin数据
    getDevtunnelPath: function () {
        return __awaiter(this, void 0, void 0, function () {
            var binPath, binList;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        binPath = this.binPath();
                        if (!fs.existsSync(binPath)) {
                            fs.mkdirSync(binPath);
                        }
                        binList = fs.readdirSync(binPath);
                        if (!!binList.includes("devtunnel.exe")) return [3 /*break*/, 2];
                        return [4 /*yield*/, downloadAndSaveFiles(baseGithubPath + "/bin", [
                                "devtunnel.exe"
                            ], binPath)];
                    case 1:
                        _a.sent();
                        binList = fs.readdirSync(binPath);
                        _a.label = 2;
                    case 2:
                        console.log("binList", binPath, binList);
                        return [2 /*return*/, Promise.resolve(binPath + "/" + "devtunnel.exe")];
                }
            });
        });
    },
    getDevtunnelHelp: function () {
        return new devtunnel_1.DevtunnelHelp(this.getDevtunnelPath());
    }
};
