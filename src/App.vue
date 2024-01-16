<script lang="ts">
import VConsole from 'vconsole';
import TunnelTable from "./components/TunnelTable.vue";
import TunnelConfig from "./components/TunnelConfig.vue";
import TunnelLog from "./components/TunnelLog.vue";
import Vue from 'vue'
import { useConfigStore } from './stores/config'
import { useUserStore } from './stores/user'
import TunnelDownload from "./components/TunnelDownload.vue";
let vConsole = new VConsole();
vConsole.hideSwitch()

// 监听Ctrl + F12 打开调试
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.keyCode === 123) {
    vConsole.show()
  }
});

enum LoginPlatformEnum {
  Github = "-g",
  GithubCode = "-gd",

  AAD = "-a",
  AADCode = "-ad",
}
export default {
  name: 'App',
  components: {TunnelDownload, TunnelLog, TunnelConfig, TunnelTable},
  data() {
    return {
      activeTab: 'first',

      isLogin: false,
      userLimit: {
        limit: 0,
        current: 0,
        resetTime: 0,
      },

      LoginPlatformEnum,

      isDownloadTunnel: false,
      isInitTunnelHelp: false,

      config: useConfigStore(),
      userStore: useUserStore(),
    }
  },
  watch: {},
  async created() {
    console.log('window.mutils', window.mutils);
    console.log('userstore', this.userStore);
    let devtunnelPath = this.config.devtunnelPath;
    if (!devtunnelPath){
      devtunnelPath = window.mutils.binPath() + "\\" + "devtunnel.exe"
    }
    console.log('devtunnelPath', devtunnelPath);
    if (devtunnelPath && await window.mutils.checkDevtunnelPath(devtunnelPath)){
      this.isDownloadTunnel = true
      this.initDevtunnelHelp(devtunnelPath)
    }
  },
  methods: {
    downloadComplete(devtunnelPath) {
      this.config.devtunnelPath = devtunnelPath
      this.config.setConfig(this.config);
      this.isDownloadTunnel = true

      console.log('downloadComplete', this.config);
      this.initDevtunnelHelp(devtunnelPath)
    },
    initDevtunnelHelp(devtunnelPath) {
      let loadder = this.$loading({
        lock: true,
        text: '正在初始化...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
      window.mutils.getDevtunnelHelp(devtunnelPath).then(async (devtunnelHelp: any) => {
        try {
          // 尝试自动登陆，从数据中获取token
          let token = this.userStore.token
          if (!token){
            token = await devtunnelHelp.getToken();
          }
          if (!token){
            throw new Error("未登录")
          }
          console.log("load token",token);
          devtunnelHelp.setToken(token);
          let isLogin = await devtunnelHelp.isLogin();
          if (!isLogin){
            this.userStore.token = null
            this.userStore.isLogin = false;
            this.userStore.save();
            throw new Error("未登录")
          }
          this.userStore.token = token
          this.userStore.save();
        }catch (e){
          console.error("未登录",e)
          return;
        }finally {
          Vue.prototype.$tunnelHelp = devtunnelHelp;
          this.isInitTunnelHelp = true
        }
        this.userStore.isLogin = true;
        setInterval(() => {
          this.userStore.isLogin = true;
        }, 1000)
        this.initUserLimits();
      }).catch(e => {
        this.$message.error(e.message)
      }).finally(() => {
        loadder.close()
      })
    },
    async initUserLimits() {
      console.log("start init");
      let userlimits = await this.$tunnelHelp.userlimits();

      this.userLimit = userlimits
    },
    openLink(url) {
      // 打开新窗口地址
      console.log('openLink', url);
      utools.shellOpenExternal(url)
    },
    async toLogin(platform) {
      let loadder = this.$loading({
        lock: true,
        text: '正在登陆...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
      try {
        let token = await this.$tunnelHelp.login(platform, (desc) => {
          if (platform === LoginPlatformEnum.AADCode || platform === LoginPlatformEnum.AAD) {
            let matches = desc.match(/code (.*?) to/);
            if (matches.length> 0){
              let code = matches[1]
              // 打开页面
              this.openLink(`https://microsoft.com/devicelogin`);
              this.$confirm('请在浏览器中输入code：' + code, '提示', {
                confirmButtonText: '已完成',
                cancelButtonText: '取消',
                type: 'warning'
              })
            }
          } else if (platform === LoginPlatformEnum.GithubCode) {
            let matches = desc.match(/enter the code:(.*)/);
            if (matches.length> 0){
              let code = matches[1].trim()
              // 打开页面
              this.openLink(`https://github.com/login/device`)
              this.$confirm('请在浏览器中输入code：' + code, '提示', {
                confirmButtonText: '已完成',
                cancelButtonText: '取消',
                type: 'warning'
              })
            }
          }
        })
        this.userStore.token = token
        this.userStore.isLogin = true;
        this.userStore.save();
      }catch (e){
        loadder.close();
        console.error("登陆失败",e)
        this.$message.error("登陆失败" + e.message)
        return;
      }
      loadder.close()
      this.initUserLimits()
    }
  }
}
</script>

<template>
  <div id="app">
    <template v-if="isDownloadTunnel">
      <template v-if="isInitTunnelHelp">
        <div class="container">
          <el-tabs v-model="activeTab" type="card" style="width: 100%">
            <el-tab-pane label="通道" name="first">
              <tunnel-table ref="tunnelTable"></tunnel-table>
            </el-tab-pane>
            <el-tab-pane label="配置" name="second">
              <tunnel-config></tunnel-config>
            </el-tab-pane>
            <el-tab-pane label="日志" name="third">
              <tunnel-log></tunnel-log>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div class="footer">
          <div class="footer-box">
            <div>
              <template v-if="userStore.isLogin">
                流量：{{ $calcUnit(userLimit.current) }} / {{ $calcUnit(userLimit.limit) }}
                <span>重置时间：{{ new Date(userLimit.resetTime * 1000).toLocaleString() }}</span>
              </template>
              <template v-else>
                <span style="margin-right: 20px;">当前未登录</span>
                <el-button size="mini" type="primary" @click="toLogin(LoginPlatformEnum.AADCode)">微软登陆
                </el-button>
                <el-button size="mini" type="primary" @click="toLogin(LoginPlatformEnum.Github)">
                  Github登陆
                </el-button>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>
    <template v-else>
      <tunnel-download @complete="downloadComplete"></tunnel-download>
    </template>
  </div>
</template>

<style scoped>
#app {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  flex: 1;
}

.footer {
  background: #f7f7f7;
  width: 100%;
  padding: 10px 20px;
}

.footer-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

</style>


<style>

</style>
