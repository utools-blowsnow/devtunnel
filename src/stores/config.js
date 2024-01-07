import { defineStore } from 'pinia'

// 你可以对 `defineStore()` 的返回值进行任意命名，但最好使用 store 的名字，同时以 `use` 开头且以 `Store` 结尾。(比如 `useUserStore`，`useCartStore`，`useProductStore`)
// 第一个参数是你的应用中 Store 的唯一 ID。
export const useConfigStore = defineStore('config', {
    state: () => {
        let defaultConfig = utools.dbStorage.getItem('config') ? JSON.parse(utools.dbStorage.getItem('config')) : {};
        return {
            clusterId: 'asse',
            devtunnelPath: null,
            logLevel: 'info',
            ...defaultConfig
        }
    },
    getters: {
    },
    actions: {
        setConfig(config) {
            for (const key of Object.keys(config)) {
                this[key] = config[key]
            }
            utools.dbStorage.setItem('config', JSON.stringify(this.$state));
        },
    },
})
