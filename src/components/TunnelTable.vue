<script lang="ts">
import SaveTunnelDialog from "./SaveTunnelDialog.vue";

export default {
  name: 'TunnelTable',
  components: {SaveTunnelDialog},
  data() {
    return {
      tunnels: [],
    }
  },
  watch: {},
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      this.refreshTunnel()
    },

    openLink(url) {
      // 打开新窗口地址
      console.log('openLink', url);
      utools.shellOpenExternal(url)
    },
    openSaveTunnelDialog(tunnel) {
      this.$refs.saveTunnelDialog.open(tunnel)
    },

    async refreshTunnel() {
      let loadder = this.$loading({
        lock: true,
        text: '正在刷新通道列表...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      try {
        let tunnels = await this.$tunnelHelp.getTunnels();
        for (const tunnel of tunnels) {
          tunnel.clusterLabel = this.$tunnelHelp.getClusterChineseName(tunnel.clusterId)
          tunnel.isStarted = this.$tunnelHelp.isStartTunnel(tunnel.tunnelId);
        }
        this.tunnels = tunnels
        console.log('this.tunnels', this.tunnels);
      } finally {
        loadder.close()
      }
    },

    async startTunnel(tunnel) {
      console.log('startTunnel', tunnel);
      let loadder = this.$loading({
        lock: true,
        text: '正在启动通道...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      try {
        await this.$tunnelHelp.startTunnel(tunnel.tunnelId, tunnel.clusterId, () => {
          tunnel.isStarted = false;
        });
        tunnel.isStarted = true;
      }catch (e){
        this.$message.error(e.message)
      }finally {
        loadder.close()
      }
    },
    async stopTunnel(tunnel) {
      console.log('stopTunnel', tunnel);
      await this.$tunnelHelp.stopTunnel(tunnel.tunnelId);
      tunnel.isStarted = false;
    },
    updateTunnel(tunnel) {
      console.log('updateTunnel', tunnel);
      this.openSaveTunnelDialog({...tunnel})
    },
    async onSaveTunnel(tunnel) {
      console.log('onSaveTunnel', tunnel);
      if(this.$tunnelHelp.isStartTunnel(tunnel.tunnelId)){
        await this.stopTunnel(tunnel);
        await this.startTunnel(tunnel);
      }
      this.refreshTunnel()
    },
    deleteTunnel(tunnel) {
      console.log('deleteTunnel', tunnel);
      this.$confirm('此操作将永久删除该通道, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        await this.$tunnelHelp.deleteTunnel(tunnel.tunnelId, tunnel.clusterId);
        this.refreshTunnel()
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
  }
}
</script>

<template>
  <div>
    <div style="padding: 0 20px;">
      <el-button icon="el-icon-refresh" @click="refreshTunnel">刷新</el-button>
      <el-button icon="el-icon-plus" @click="openSaveTunnelDialog(null)">新增通道</el-button>
    </div>
    <el-table
        :data="tunnels"
        style="width: 100%">
      <el-table-column type="expand">
        <template v-slot="scope">
          <el-form label-position="left" inline class="demo-table-expand">
            <el-form-item label="当前下载 / 当前上传">
              <span>{{
                  $calcUnit(scope.row.status.downloadRate ? scope.row.status.downloadRate.current : 0)
                }} / {{ $calcUnit(scope.row.status.uploadRate ? scope.row.status.uploadRate.current : 0) }}</span>
            </el-form-item>
            <el-form-item label="总下载量 / 总上传量">
              <span>{{
                  $calcUnit(scope.row.status.downloadTotal || 0)
                }} / {{ $calcUnit(scope.row.status.uploadTotal || 0) }}</span>
            </el-form-item>

            <el-form-item label="创建时间">
              <span>{{ new Date(scope.row.created).toLocaleString() }}</span>
            </el-form-item>
            <el-form-item label="过期时间">
              <span>{{ new Date(scope.row.expiration).toLocaleString() }}</span>
            </el-form-item>
          </el-form>

          <el-table :data="scope.row.ports" style="width: 100%;margin: 0 40px;">
            <el-table-column
                prop="protocol"
                label="协议"
                width="100">
            </el-table-column>
            <el-table-column
                prop="portNumber"
                label="端口"
                width="100">
            </el-table-column>
            <el-table-column
                prop="description"
                label="映射地址">
            </el-table-column>

            <el-table-column
                label="操作">
              <template v-slot="portScope">
                <el-button size="small" @click="openLink(portScope.row.portForwardingUris[0])">
                  访问地址
                </el-button>
                <el-button size="small" type="danger"
                           @click="openLink(portScope.row.inspectionUri)">检查地址
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-table-column>
      <el-table-column
          prop="clusterLabel"
          label="区域"
          width="100">
      </el-table-column>
      <el-table-column
          prop="tunnelId"
          label="通道ID"
          width="150">
      </el-table-column>
      <el-table-column
          prop="description"
          label="通道名称">
      </el-table-column>
      <!--      <el-table-column-->
      <!--          label="代理数量"-->
      <!--          width="100">-->
      <!--        <template v-slot="scope">-->
      <!--          {{ scope.row.status.hostConnectionCount }}-->
      <!--        </template>-->
      <!--      </el-table-column>-->

      <el-table-column
          label="操作">
        <template v-slot="scope">
          <el-button v-if="scope.row.isStarted" type="danger" size="small"
                     @click="stopTunnel(scope.row)">停止
          </el-button>
          <el-button v-else size="small" type="primary" @click="startTunnel(scope.row)">启动
          </el-button>
          <el-button size="small" @click="updateTunnel(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteTunnel(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <save-tunnel-dialog ref="saveTunnelDialog" @update="onSaveTunnel"></save-tunnel-dialog>
  </div>
</template>

<style scoped>

</style>
