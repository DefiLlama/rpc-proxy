const HyperExpress = require('hyper-express')
const { getNetworkInfo, Network } = require('@injectivelabs/networks')
const { IndexerGrpcMitoApi, protoObjectToJson, IndexerGrpcSpotApi, IndexerGrpcDerivativesApi, ChainGrpcBankApi } = require('@injectivelabs/sdk-ts')
let clients = {}

const TYPES = {
  BANK: 'BANK',
  SPOT: 'SPOT',
  DERIVATIVES: 'DERIVATIVES',
}

let mitoApi

function getMitoApi() {
  if (!mitoApi)
    mitoApi = new IndexerGrpcMitoApi("https://k8s.mainnet.mito.grpc-web.injective.network")
  return mitoApi
}


function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/injective', router)

  router.get('/mito-vault/:address', async (req, res) => {
    const { address } = req.params
    const response = await getMitoApi().fetchVault({ contractAddress: address })
    res.json(response)
  })
  router.post('/orderbook/markets', async (req, res) => {
    const {type = TYPES.SPOT, marketStatus = 'active' } = await req.json()
    const markets = await getClient(type).fetchMarkets({ marketStatus, })
    res.json(p2j(markets))
  })
  router.post('/orderbook/orders', async (req, res) => {
    const {type = TYPES.SPOT, marketIds} = await req.json()
    const chunks = sliceIntoChunks(marketIds, 20)
    const response = []
    for (const chunk of chunks)
      response.push(...await getClient(type).fetchOrderbooksV2(chunk))
    res.json(response)
  })
}

module.exports = { setRoutes }


function sliceIntoChunks(arr, chunkSize = 100) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

const p2j = str => JSON.parse(protoObjectToJson(str))

function getClient(type = TYPES.SPOT) {
  if (!clients[type]) {
    const network = getNetworkInfo(Network.Mainnet)
    if (type === TYPES.SPOT)
      clients[type] = new IndexerGrpcSpotApi(network.indexer);
    else if (type === TYPES.DERIVATIVES)
      clients[type] = new IndexerGrpcDerivativesApi(network.indexer)
    else if(type === TYPES.BANK)
    clients[type] = new ChainGrpcBankApi(network.grpc)
    else
      throw new Error('Unknown type')
  }
  return clients[type]
}
