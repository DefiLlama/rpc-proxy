const HyperExpress = require('hyper-express')
const { IndexerGrpcMitoApi } = require('@injectivelabs/sdk-ts')

const injectiveMitoApi = new IndexerGrpcMitoApi("https://k8s.mainnet.mito.grpc-web.injective.network")


function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/injective', router)

  router.get('/mito-vault/:address', async (req, res) => {
    const { address } = req.params
    const response = await injectiveMitoApi.fetchVault({ contractAddress: address })
    res.json(response)
  })
}

module.exports = { setRoutes }