<script lang="ts">
import {defineComponent} from 'vue'
export default defineComponent({
  name: "SaveTunnelDialog",
  data() {
    return {
      drawer: false,
      direction: 'rtl',

      isAdd: true,
      form: {
        tunnelId: null,
        clusterId: null,
        description: null,
        ports: []
      },

      clusters: [],
    }
  },
  async mounted() {
    this.clusters = await this.$tunnelHelp.getClusters();
  },
  methods: {
    open(tunnel = null) {
      this.drawer = true;
      this.form = {
        clusterId: 'asse',
        tunnelId: 'utools-' + Math.random().toString(36).substr(2),
        description: null,
        ports: []
      }
      if (tunnel) {
        this.isAdd = false;
        this.form = tunnel;
        for (const port of this.form.ports) {
          if (!port.options)  port.options = {};
          if (!port.options.hostHeader) {
            port.options.hostHeader = null;
          }
          if (!port.options.originHeader) {
            port.options.originHeader = null;
          }
        }
      } else {
        this.isAdd = true;
      }
    },

    addPort() {
      this.form.ports.push({
        protocol: 'auto',
        portNumber: null,
        description: null,
        options: {
          hostHeader: null,
          originHeader: null,
        }
      })
    },
    removePort(scope) {
      console.log('removePort', scope);
      this.form.ports.splice(scope.$index, 1)
    },

    async onSubmit() {
      console.log('submit!');
      let loadder = this.$loading({
        lock: true,
        text: '正在保存...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      try {
        // 如果带了http
        for (const port of this.form.ports) {
          if (port.options.hostHeader && port.options.hostHeader.startsWith('http')) {
            port.options.hostHeader = port.options.hostHeader.replaceAll('https://', '');
            port.options.hostHeader = port.options.hostHeader.replaceAll('http://', '');
          }
          if (port.options.originHeader && port.options.originHeader.startsWith('http')) {
            port.options.originHeader = port.options.originHeader.replaceAll('https://', '');
            port.options.originHeader = port.options.originHeader.replaceAll('http://', '');
          }
          if (port.description && port.description.startsWith('http')) {
            port.description = port.description.replaceAll('https://', '');
            port.description = port.description.replaceAll('http://', '');
          }
        }
        if (this.isAdd) {
          await this.$tunnelHelp.createTunnel(this.form, this.form.ports);
        } else {
          await this.$tunnelHelp.updateTunnel(this.form);
        }
      } catch (e) {
        console.error(e)
        this.$message.error(e.message)
        return;
      }finally {
        loadder.close()
      }
      this.drawer = false;
      this.$emit('update', this.form)
    },
    onCancel() {
      this.drawer = false;
    }
  }
})
</script>

<template>
  <el-drawer
      title="更新通道"
      size="100%"
      :visible.sync="drawer"
      :direction="direction">
    <el-form ref="form" :model="form" label-width="80px" style="padding: 0 20px ">
      <el-form-item label="通道ID">
        <el-input v-model="form.tunnelId" disabled></el-input>
      </el-form-item>
      <el-form-item label="集群区域">
        <el-select v-model="form.clusterId" placeholder="请选择集群区域" :disabled="!isAdd">
          <el-option v-for="item in clusters" :label="item.label"
                     :value="item.clusterId"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="通道名称">
        <el-input v-model="form.description"></el-input>
      </el-form-item>
      <el-form-item label="端口列表">
        <el-table :data="form.ports" style="width: 100%;">
          <el-table-column
              prop="protocol"
              label="协议"
              width="100">
            <template v-slot="scope">
              <el-select v-model="scope.row.protocol" placeholder="请选择协议">
                <el-option label="自动" value="auto"></el-option>
                <el-option label="HTTP" value="http"></el-option>
                <el-option label="HTTPS" value="https"></el-option>
<!--                <el-option label="TCP" value="tcp"></el-option>-->
<!--                <el-option label="UDP" value="udp"></el-option>-->
<!--                <el-option label="SSH" value="ssh"></el-option>-->
<!--                <el-option label="RDP" value="rdp"></el-option>-->
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
              prop="portNumber"
              label="端口"
              width="150">
            <template v-slot="scope">
              <el-input v-model="scope.row.portNumber" type="number"></el-input>
            </template>
          </el-table-column>
          <el-table-column
              prop="description"
              min-width="200"
              label="映射地址(IP:端口)">
            <template v-slot="scope">
              <el-input v-model="scope.row.description"
                        placeholder="留空默认映射对应本机端口"></el-input>
            </template>
          </el-table-column>
          <el-table-column
              label="Host header"
              width="150">
            <template v-slot="scope">
              <el-input v-model="scope.row.options.hostHeader" ></el-input>
            </template>
          </el-table-column>
          <el-table-column
              label="Origin header"
              width="150">
            <template v-slot="scope">
              <el-input v-model="scope.row.options.originHeader" ></el-input>
            </template>
          </el-table-column>
          <el-table-column
              label="操作">
            <template v-slot="scope">
              <el-button size="small" type="danger" @click="removePort(scope)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button style="width: 100%" size="small" @click="addPort">添加端口</el-button>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="onSubmit">保存</el-button>
        <el-button @click="onCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<style scoped>

</style>
