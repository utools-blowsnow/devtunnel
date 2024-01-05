<script lang="ts">
import VConsole from 'vconsole';

let vConsole = new VConsole();
vConsole.hideSwitch()

// 监听Ctrl + F12 打开调试
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.keyCode === 123) {
    vConsole.show()
  }
});
export default {
  name: 'App',
  data() {
    return {}
  },
  watch: {},
  mounted() {
    this.init();
  },
  methods: {
    async init() {

    },
  }
}
</script>

<template>
  <div id="app">
    <div class="container">
    </div>
  </div>
</template>

<style scoped>
#app {
  margin: 0;
  padding: 0;
}

.container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

</style>
