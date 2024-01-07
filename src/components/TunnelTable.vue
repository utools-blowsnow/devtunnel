<script lang="ts">
import SaveTunnelDialog from "./SaveTunnelDialog.vue";

export default {
  name: 'TunnelTable',
  components: {SaveTunnelDialog},
  data() {
    return {
      tunnels: [],

      showType: 'card',
      loading: false,
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
      this.loading = true
      try {
        let tunnels = await this.$tunnelHelp.getTunnels();
        for (const tunnel of tunnels) {
          tunnel.clusterLabel = this.$tunnelHelp.getClusterChineseName(tunnel.clusterId)
          tunnel.isStarted = this.$tunnelHelp.isStartTunnel(tunnel.tunnelId);
        }
        this.tunnels = tunnels
        console.log('this.tunnels', this.tunnels);
      } finally {
        this.loading = false
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
  <div class="tunnel-table">
    <div class="tunnel-view-header">
      <div>
        <el-button icon="el-icon-refresh" @click="refreshTunnel" size="small">刷新</el-button>
        <el-button icon="el-icon-plus" @click="openSaveTunnelDialog(null)" size="small">新增通道</el-button>
      </div>
      <div>
        展示格式：
        <el-select v-model="showType" size="small" style="width: 120px;">
          <el-option label="卡片" value="card"></el-option>
          <el-option label="表格" value="table"></el-option>
        </el-select>
      </div>
    </div>

    <div class="tunnel-view"
         v-loading="loading"
         element-loading-text="正在加载通道中..."
         element-loading-spinner="el-icon-loading"
         element-loading-background="rgba(0, 0, 0, 0.7)"
    >
      <el-row v-if="showType === 'card'" :gutter="20" style="margin: 0">
        <el-col v-for="tunnel in tunnels" :span="12" class="tunnel-server-item">
          <el-card class="tunnel-server-item-card">
            <div slot="header" class="clearfix">
              <span>{{ tunnel.description || '未命名' }}</span>
            </div>
            <el-form label-position="left"  label-width="70px">
              <el-form-item label="集群区域">
                <span>{{ tunnel.clusterId }} ({{ tunnel.clusterLabel }})</span>
              </el-form-item>
              <el-form-item label="通道ID">
                <span>{{ tunnel.tunnelId }}</span>
              </el-form-item>
              <el-form-item label="映射地址">
                <span v-if="tunnel.endpoints.length > 0">{{ tunnel.endpoints[0].tunnelUri }}</span>
              </el-form-item>
              <el-form-item label="端口列表">
                <el-link v-for="port in tunnel.ports" :key="port.portNumber" style="margin-right: 10px;"
                         @click="openLink(port.portForwardingUris[0])">
                  {{ port.protocol }}:{{ port.portNumber }}
                </el-link>
              </el-form-item>
              <el-form-item label="当前流量">
               <span>{{
                  $calcUnit(tunnel.status.downloadRate ? tunnel.status.downloadRate.current : 0)
                }} ↓ / {{ $calcUnit(tunnel.status.uploadRate ? tunnel.status.uploadRate.current : 0) }} ↑</span>
              </el-form-item>
              <el-form-item label="总数据量">
                <span>{{
                  $calcUnit(tunnel.status.downloadTotal || 0)
                }} ↓ / {{ $calcUnit(tunnel.status.uploadTotal || 0) }} ↑</span>
              </el-form-item>

              <el-form-item label="创建时间">
                <span>{{ new Date(tunnel.created).toLocaleString() }}</span>
              </el-form-item>
              <el-form-item label="过期时间">
                <span>{{ new Date(tunnel.expiration).toLocaleString() }}</span>
              </el-form-item>
            </el-form>

            <div style="display: flex;justify-content: end;">
              <el-button v-if="tunnel.isStarted" type="danger" size="small"
                         @click="stopTunnel(tunnel)">停止
              </el-button>
              <el-button v-else size="small" type="primary" @click="startTunnel(tunnel)">启动</el-button>
              <el-button size="small" @click="updateTunnel(tunnel)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteTunnel(tunnel)">删除</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-table v-if="showType === 'table'"
                :data="tunnels"
                style="width: 100%">
        <el-table-column type="expand">
          <template v-slot="scope">
            <el-form label-position="left" inline class="demo-table-expand">
              <el-form-item label="当前流量">
               <span>{{
                   $calcUnit(scope.row.status.downloadRate ? scope.row.status.downloadRate.current : 0)
                 }} ↓ / {{ $calcUnit(scope.row.status.uploadRate ? scope.row.status.uploadRate.current : 0) }} ↑</span>
              </el-form-item>
              <el-form-item label="总数据量">
                <span>{{
                    $calcUnit(scope.row.status.downloadTotal || 0)
                  }} ↓ / {{ $calcUnit(scope.row.status.uploadTotal || 0) }} ↑</span>
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
    </div>

    <save-tunnel-dialog ref="saveTunnelDialog" @update="onSaveTunnel"></save-tunnel-dialog>
  </div>
</template>

<style >
.tunnel-view-header{
  padding: 0px 20px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
}
.tunnel-view{
  background: #f2f3f5;
  height: calc(100vh - 145px);
  overflow: auto;
}
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


.tunnel-server-item {
  margin-top: 20px
}

.tunnel-server-item-card{
  border-radius: 10px;
}
.tunnel-server-item-card .el-card__header{
  padding: 10px 20px;
}
.tunnel-server-item .el-form-item {
  margin-right: 0 !important;
  margin-bottom: 0 !important;
  width: 100%;
}
.tunnel-server-item .el-form-item__label {
  color: #99a9bf;
  line-height: 25px;
}
.tunnel-server-item .el-form-item__content{
  line-height: 25px;
}

</style>
