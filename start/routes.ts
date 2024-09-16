/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const TendersController = () => import('#controllers/tenders_controller')
const BidsController = () => import('#controllers/bids_controller')

router.get('/api/ping', async () => {
  return 'ok'
})

router
  .group(() => {
    router
      .group(() => {
        router.get('/', [TendersController, 'index'])
        router.post('/new', [TendersController, 'store'])
        router.get('/my', [TendersController, 'userTenders'])
        router.get('/:id/status', [TendersController, 'tenderStatus'])
        router.put('/:id/status', [TendersController, 'editTenderStatus'])
        router.patch('/:id/edit', [TendersController, 'editTender'])
        router.put('/:id/rollback/:version', [TendersController, 'rollbackTender'])
      })
      .prefix('/tenders')
    router
      .group(() => {
        router.post('/new', [BidsController, 'store'])
        router.get('/my', [BidsController, 'userBids'])
        router.get('/:id/list', [BidsController, 'bidsList'])
        router.get('/:id/status', [BidsController, 'bidStatus'])
        router.put('/:id/status', [BidsController, 'updateBidStatus'])
        router.patch('/:id/edit', [BidsController, 'updateBid'])
        router.put('/:id/submit_decision', [BidsController, 'submitDecision'])
        router.put('/:id/feedback', [BidsController, 'sendFeedback'])
        router.get('/:id/reviews', [BidsController, 'viewFeedback'])
        router.put('/:id/rollback/:version', [BidsController, 'rollbackBid'])
      })
      .prefix('/bids')
  })
  .prefix('/api')
