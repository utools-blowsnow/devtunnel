import { defineStore } from 'pinia'

// 你可以对 `defineStore()` 的返回值进行任意命名，但最好使用 store 的名字，同时以 `use` 开头且以 `Store` 结尾。(比如 `useUserStore`，`useCartStore`，`useProductStore`)
// 第一个参数是你的应用中 Store 的唯一 ID。
const key = 'user'
export const useUserStore = defineStore('user', {
    state: () => {
        let defaultConfig = utools.dbStorage.getItem(key) ? JSON.parse(utools.dbStorage.getItem(key)) : {};
        console.log("get config", key, defaultConfig);
        return {
            token: null,
            isLogin: false,
            ...defaultConfig
        }
    },
    getters: {
    },
    actions: {
        save() {
            let data = {...this.$state};
            // 筛选掉不需要保存的数据
            delete data.isLogin;
            utools.dbStorage.setItem(key, JSON.stringify(data));
            console.log("save" , key, JSON.stringify(data));
        },
    },
})
