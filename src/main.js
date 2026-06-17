import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { mockApi } from './api/mockApi.js'

const app = createApp(App)
app.config.globalProperties.$api = mockApi
app.mount('#app')
