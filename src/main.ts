import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

import './assets/main.css'

Vue.use(ElementUI);

console.log(window.mutils);
Vue.prototype.$calcUnit = function (size: number) {
    let units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    while (size >= 1024) {
        size /= 1024;
        i++;
    }
    return size.toFixed(2) + units[i];
}


new Vue({
    render: (h) => h(App)
}).$mount('#app')
