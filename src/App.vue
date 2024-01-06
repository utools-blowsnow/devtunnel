<script lang="ts">
import VConsole from 'vconsole';
import TunnelTable from "./components/TunnelTable.vue";
import TunnelConfig from "./components/TunnelConfig.vue";
import TunnelLog from "./components/TunnelLog.vue";

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
  GithubCode = "-g -d",

  AAD = "-a",
  AADCode = "-a -d",
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
    }
  },
  watch: {},
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      let userlimits = await this.$tunnelHelp.userlimits();
      this.userLimit = userlimits
      this.isLogin = await this.$tunnelHelp.isLogin()
    },

    async toLogin(platform) {
      await this.$tunnelHelp.login(platform)
      this.init()
    }
  }
}
</script>

<template>
  <div id="app">
    <div class="container">
      <el-tabs v-model="activeTab" type="card" style="width: 100%">
        <el-tab-pane label="通道" name="first">
          <tunnel-table></tunnel-table>
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
            <el-button size="mini" type="primary" @click="toLogin(LoginPlatformEnum.AAD)">微软登陆
            </el-button>
            <el-button size="mini" type="primary" @click="toLogin(LoginPlatformEnum.Github)">
              Github登陆
            </el-button>
          </template>
        </div>
      </div>
    </div>
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
