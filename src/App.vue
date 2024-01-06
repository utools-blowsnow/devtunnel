<script lang="ts">
import VConsole from 'vconsole';
import TunnelTable from "./components/TunnelTable.vue";
import TunnelConfig from "./components/TunnelConfig.vue";
import TunnelLog from "./components/TunnelLog.vue";
import Vue from 'vue'
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
  components: {TunnelLog, TunnelConfig, TunnelTable},
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

      isInitTunnelHelp: false,
    }
  },
  watch: {},
  mounted() {
    let loadder = this.$loading({
      lock: true,
      text: '正在初始化...',
      spinner: 'el-icon-loading',
      background: 'rgba(0, 0, 0, 0.7)'
    });
    console.log('window.mutils', window.mutils);
    window.mutils.getDevtunnelHelp((msg) => {
      loadder.close()
      loadder = this.$loading({
        lock: true,
        text: msg,
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
    }).then(async (devtunnelHelp) => {
      if ( utools.dbStorage.getItem('config')) {
        let config = JSON.parse(utools.dbStorage.getItem('config'));
        if (config.devtunnelPath) devtunnelHelp.setDevTunnelPath(config.devtunnelPath);
      }
      try {
        await devtunnelHelp.initToken();
      }catch (e){}
      Vue.prototype.$tunnelHelp = devtunnelHelp;
      this.isInitTunnelHelp = true
      this.init();
    }).catch(e => {
      this.$message.error(e.message)
    }).finally(() => {
      loadder.close()
    })
  },
  methods: {
    async init() {
      let userlimits = await this.$tunnelHelp.userlimits();
      this.userLimit = userlimits
      this.isLogin = await this.$tunnelHelp.isLogin()
    },
    openLink(url) {
      // 打开新窗口地址
      console.log('openLink', url);
      utools.shellOpenExternal(url)
    },
    async toLogin(platform) {
      await this.$tunnelHelp.login(platform, (desc) => {
        if (platform === LoginPlatformEnum.AADCode || platform === LoginPlatformEnum.AAD) {
          let matches = desc.match(/code (.*?) to/);
          if (matches.length> 0){
            let code = matches[1]
            // 打开页面
            this.openLink(`https://microsoft.com/devicelogin`);
            this.$confirm('请在浏览器中输入code=' + code, '提示', {
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
            this.$confirm('请在浏览器中输入code=' + code, '提示', {
              confirmButtonText: '已完成',
              cancelButtonText: '取消',
              type: 'warning'
            })
          }
        }
      })
      this.init()
      this.$refs.tunnelTable.refreshTunnel()
    }
  }
}
</script>

<template>
  <div id="app">
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
            <template v-if="isLogin">
              流量：{{ $calcUnit(userLimit.current) }} / {{ $calcUnit(userLimit.limit) }}
              <span>重置时间：{{ new Date(userLimit.resetTime * 1000).toLocaleString() }}</span>
            </template>
            <template v-else>
              <span>未登录</span>
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
  </div>
</template>

<style scoped>
#app {
  margin: 0;
  padding: 0;
  margin-bottom: 60px;
}

.container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.footer {
  position: fixed;
  bottom: 0;
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
.demo-table-expand {
  font-size: 0;
  margin: 0 40px;
}

.demo-table-expand .el-form-item__label {
  color: #99a9bf;
}

.demo-table-expand .el-form-item {
  margin-right: 0 !important;
  margin-bottom: 0 !important;
  width: 50%;
}
</style>
