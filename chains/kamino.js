const { Kamino } = require('@kamino-finance/kliquidity-sdk')
const { getReservesForMarket, PROGRAM_ID } = require('@kamino-finance/klend-sdk')
const { Connection, } = require("@solana/web3.js")
const HyperExpress = require('hyper-express')
const { PublicKey } = require('@solana/web3.js')

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
    const connection = getConnection()
    const kamino = new Kamino('mainnet-beta', connection)
    const shareData = await kamino.getStrategiesShareData({});
    return shareData.reduce((a, i) => a + i.shareData.balance.computedHoldings.totalSum.toNumber(), 0)
  }
}

async function getKaminoLendMarketReserves(market) {
  market = new PublicKey(market)
  const  reserves  = await getReservesForMarket(market, getConnection(), PROGRAM_ID)
  return [...reserves].map(([_, i]) => ({
    token: i.state.collateral.mintPubkey.toString(),
    price: Number(i.tokenOraclePrice.price),
    decimals: i.tokenOraclePrice.decimals.e,
    symbol: i.symbol,
  }))
}

let connection
function getConnection() {
  if (!connection) {
    connection = new Connection(process.env.SOLANA_RPC)
  }
  return connection
}

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/kamino', router)

  router.get('/tvl', async (_req, res) => {
    res.json(await getCachedTvl())
  })

  router.get('/lend/:market', async (req, res) => {
    const { market } = req.params
    res.json(await getKaminoLendMarketReserves(market))
  })
}

module.exports = { setRoutes }
