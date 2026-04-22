import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAccountStore } from './stores/accountStore'

const app = createApp(App)
const account = useAccountStore()

app.use(router)

Promise.all([router.isReady(), account.bootstrapSession()]).finally(() => {
  app.mount('#app')
})
