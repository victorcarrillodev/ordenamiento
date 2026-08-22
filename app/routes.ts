import { form, get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  participation: form('participation'),

  poetdum:{
    show:get("/poetdum")
  }

})
