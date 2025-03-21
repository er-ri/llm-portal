import type { Router } from 'vue-router'
import { useAuthStoreWithout } from '@/store/modules/auth'

export function setupPageGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStoreWithout()
    if (!authStore.session) {
      try {
        const data = await authStore.getSession()
        if (String(data.auth) === 'false' && authStore.token)
          authStore.removeToken()
        if (to.path === '/500')
          next({ name: 'Root' })
        else
          next()
      }
      catch (error) {        
        // if (to.path !== '/500')
        //   next({ name: '500' })
        // else
        //   next()

        // For testing
        if (to.path !== '/500' && to.path !== '/chat' && to.path !== '/chat/1002')
          next({ name: '500' })
        else if (to.path === '/500')
          next({ name: 'Root' })
        else
          next()
      }
    }
    else {
      next()
    }
  })
}
