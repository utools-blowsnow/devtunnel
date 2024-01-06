<script lang="ts">
export default {
  name: "TunnelConfig",
  data() {
    return {
      clusters: [],
      form: {
        clusterId: 'asse',
        devtunnelPath: null,
        logLevel: 'info',
      }
    }
  },
  async mounted() {
    this.form.devtunnelPath = await window.mutils.getDevtunnelPath();
    // this.clusters = await this.$tunnelHelp.getClusters();
    if ( utools.dbStorage.getItem('config')) {
      this.form = {
        ...this.form,
        ...JSON.parse(utools.dbStorage.getItem('config'))
      };

      this.$tunnelHelp.setDevTunnelPath(this.form.devtunnelPath);
    }
  },
  methods: {
    onSubmit() {
      console.log('submit!');
      utools.dbStorage.setItem('config', JSON.stringify(this.form));

      this.$tunnelHelp.setDevTunnelPath(this.form.devtunnelPath);

      this.$message.success('保存成功');
    }
  }
}
</script>

<template>
  <el-form ref="form" :model="form" label-width="120px" style="margin: 0 20px">
<!--    <el-form-item label="集群区域">-->
<!--      <el-select v-model="form.clusterId" placeholder="请选择集群区域">-->
<!--        <el-option v-for="item in clusters" :label="item.label" :value="item.clusterId"></el-option>-->
<!--      </el-select>-->
<!--    </el-form-item>-->
    <el-form-item label="devtunnel路径">
      <el-input v-model="form.devtunnelPath"></el-input>
      <small>下载地址：https://github.com/utools-blowsnow/devtunnel/blob/master/other/devtunnel.exe</small>
    </el-form-item>

    <el-form-item label="日志级别">
      <el-select v-model="form.logLevel" placeholder="请选择日志级别">
        <el-option label="简单" value="info"></el-option>
        <el-option label="完整" value="trace"></el-option>
      </el-select>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="onSubmit">保存</el-button>
      <el-button>取消</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>

</style>
