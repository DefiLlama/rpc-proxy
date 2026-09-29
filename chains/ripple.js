const HyperExpress = require('hyper-express')
const xrpl = require("xrpl");

let client = null

async function getClient() {
  if (!client || !client.isConnected()) {
    client = new xrpl.Client('wss://xrplcluster.com/')
    await client.connect()
  }
  return client
}

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()

  routerPrime.use('/ripple', router)

  router.post('/gateway_balances', async (req, res) => {
    try {
      const { account, hotwallet } = await req.json()
      if (!account || !hotwallet) {
        return res.status(400).json({ error: 'account and hotwallet are required' })
      }

      const xrplClient = await getClient()
      const issuerAccountInfo = await xrplClient.request({
        command: 'gateway_balances',
        account,
        hotwallet: [hotwallet],
      })

      res.json(issuerAccountInfo.result)
    } catch (e) {
      console.error('[ripple] /gateway_balances error:', e)
      client = null // reset on error so next request reconnects
      res.status(500).json({ error: 'Internal server error' })
    }
  })
}

module.exports = { setRoutes }
