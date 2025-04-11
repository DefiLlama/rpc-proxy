const HyperExpress = require('hyper-express')
const { Provider, Contract } = require('fuels')

let provider
async function getProvider() {
  if (!provider) provider = new Provider('https://mainnet.fuel.network/v1/graphql')
  return provider
}

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()

  routerPrime.use('/fuel', router)

  router.post('/query', async (req, res) => {
    const { contractId, abi, method } = await req.json()

    const contract = new Contract(contractId, abi, await getProvider())
    const { value } = await contract.functions[method]().get()
    res.json(value)
  })
}

module.exports = { setRoutes }