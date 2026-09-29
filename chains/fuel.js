const HyperExpress = require('hyper-express')
const { Provider, Contract } = require('fuels')

let provider
async function getProvider() {
  if (!provider) provider = new Provider(process.env.FUEL_CUSTOM_RPC ?? 'https://mainnet.fuel.network/v1/graphql')
  return provider
}

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()

  routerPrime.use('/fuel', router)

  router.post('/query', async (req, res) => {
    try {
      const { contractId, abi, method, params = [] } = await req.json()

      if (!contractId || !abi || !method) {
        return res.status(400).json({ error: 'contractId, abi and method are required' })
      }

      const contract = new Contract(contractId, abi, await getProvider())

      if (typeof contract.functions[method] !== 'function') {
        return res.status(400).json({ error: `method "${method}" does not exist on contract` })
      }

      const { value } = await contract.functions[method](...params).get()
      res.json(value)
    } catch (e) {
      console.error('[fuel] /query error:', e)
      res.status(500).json({ error: 'Internal server error' })
    }
  })
}

module.exports = { setRoutes }
