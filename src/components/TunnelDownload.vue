<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  name: "TunnelDownload",
  data() {
    return {
      percentage: 0,
      downloadUrl: 'https://github.com/utools-blowsnow/devtunnel/blob/master/other/devtunnel.exe',
      githubSpeedUrl: '',
      githubSpeedUrls: [
        'https://mirror.ghproxy.com/',
        'https://ghps.cc/',
        'https://hub.gitmirror.com/'
      ],
      downloadPath: '',

      downloading: false,
    }
  },
  mounted() {
    this.githubSpeedUrl = this.githubSpeedUrls[0]
    this.downloadPath = window.mutils.binPath() + "\\" + "devtunnel.exe"
  },
  methods: {
    download() {
      this.downloading = true
      window.mutils.donwloadDevtunnel(this.githubSpeedUrl +  this.downloadUrl, this.downloadPath, (progressEvent) => {
        console.log('progressEvent', progressEvent);
        this.percentage = parseInt(progressEvent.progress * 100 + "");
      }).then((path) => {
        this.$message.success('下载成功')
        this.$emit('complete',path);
      }).catch((err) => {
        this.$message.error('下载失败：' + err.message )
      }).finally(() => {
        this.downloading = false
      })
    },
    closeUtools() {

    }
  }
})
</script>

<template>
  <div class="tunnel-download">
    <div class="tunnel-download-agree">
      <el-form ref="form" label-width="120px">
        <el-form-item label="加速地址：">
          <el-select v-model="githubSpeedUrl" style="width: 100%;">
            <el-option v-for="item in githubSpeedUrls" :label="item" :value="item"></el-option>
          </el-select>
          <small>提示：用于加速github下载的地址</small>
        </el-form-item>
        <el-form-item label="下载路径：">
          <el-input v-model="downloadPath"></el-input>
          <small>将自动下载devtunnel文件到该目录</small>
        </el-form-item>
        <el-form-item label="使用许可：">
          <p>调用微软devtunnel进行可视化管理工具</p>
          <p>继续下载将视为同意本插件调用第三方应用(微软devtunnel)</p>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="download" v-loading="downloading">同意并下载</el-button>
          <el-button @click="closeUtools">不同意</el-button>
        </el-form-item>
      </el-form>
      <el-progress :percentage="percentage"></el-progress>
    </div>
  </div>
</template>

<style scoped>
.tunnel-download{
  width: 500px;
  margin: 0 auto;
  margin-top: 20px;
}
</style>
