import { initBotId } from 'botid/client/core'

initBotId({
  protect: [
    { path: '/api/guestbook', method: 'POST' },
    { path: '/api/fit', method: 'POST' },
    { path: '/api/meetings', method: 'POST' },
  ],
})
