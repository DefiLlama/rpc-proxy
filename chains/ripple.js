const express = require('express')
const xrpl = require("xrpl");

function setRoutes(routerPrime) {
  const router = express.Router()

  routerPrime.use('/ripple', router)

  router.post('/gateway_balances', async (req, res) => {
    const { account, hotwallet } = req.body
    const client = new xrpl.Client('wss://xrplcluster.com/');
    await client.connect();

    try {
      const issuerAccountInfo = await client.request({
        command: 'gateway_balances',
        account,
        hotwallet: [hotwallet],
      });

      res.json(issuerAccountInfo.result)
    } finally {
      try {
        await client.disconnect();
      } catch (e) {
        console.error('Failed to disconnect xrpl client', e);
      }
    }
  })
}

module.exports = { setRoutes }