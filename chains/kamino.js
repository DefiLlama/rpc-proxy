const { Kamino } = require('@kamino-finance/kliquidity-sdk')
const { Connection, } = require("@solana/web3.js")
const HyperExpress = require('hyper-express')

let cachedTvl = null
let cacheTimestamp = null

async function getCachedTvl() {
  const cacheDuration = 20 * 60 * 60 * 1000 // 20 hours in milliseconds
  const now = Date.now()

  if (cachedTvl && cacheTimestamp && (now - cacheTimestamp < cacheDuration))
    return cachedTvl


  cachedTvl = getTvl()
  cacheTimestamp = now
  return cachedTvl

  async function getTvl() {
    const connection = new Connection(process.env.SOLANA_RPC)
    const kamino = new Kamino('mainnet-beta', connection)
    const shareData = await kamino.getStrategiesShareData({});
    return shareData.reduce((a, i) => a + i.shareData.balance.computedHoldings.totalSum.toNumber(), 0)
  }
}

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/kamino', router)

  router.get('/tvl', async (_req, res) => {
    res.json(await getCachedTvl())
  })
}

module.exports = { setRoutes }