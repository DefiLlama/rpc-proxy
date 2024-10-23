const HyperExpress = require('hyper-express')
const xrpl = require("xrpl");

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()

  routerPrime.use('/ripple', router)

  router.post('/gateway_balances', async (req, res) => {
    const { account, hotwallet } = await req.json()
    const client = new xrpl.Client('wss://xrplcluster.com/');
    await client.connect();
  
    const issuerAccountInfo = await client.request({
      command: 'gateway_balances',
      account,
      hotwallet: [hotwallet],
    });
  
    client.disconnect();

    res.json(issuerAccountInfo.result)
  })
}

module.exports = { setRoutes }