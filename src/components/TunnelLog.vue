<script lang="ts">
import {defineComponent} from 'vue'
import { useConfigStore } from '../stores/config'

export default defineComponent({
  name: "TunnelLog",
  data() {
    return {
      logList: [],

      config: useConfigStore(),
    }
  },
  computed: {
    logContent() {
      let contents = []
      for (const param of this.logList) {
        let temp = '';
        if (param instanceof String) temp = param
        else temp = JSON.stringify(param)
        contents.push(temp)
      }
      return this.logList.join('\n')
    }
  },
  mounted() {
    window.mutils.setLoggerListener((level, params) => {
      if (level.toLowerCase() === 'trace' && this.config.logLevel !== 'trace'){
        console.log('ignore trace log');
        return;
      }
      this.logList.push(params)
    })
  }
})
</script>

<template>
  <div class="tunnel-log">
    <el-input type="textarea" rows="100"
              ref="logTextarea"
              v-model="logContent"
              readonly></el-input>
  </div>
</template>

<style>
.tunnel-log .el-textarea .el-textarea__inner {
  max-height: calc(100vh - 120px);
}
</style>
