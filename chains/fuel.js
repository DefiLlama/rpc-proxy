const express = require('express')
const { Provider, Contract } = require('fuels')

let provider
async function getProvider() {
  if (!provider) provider = new Provider(process.env.FUEL_CUSTOM_RPC ?? 'https://mainnet.fuel.network/v1/graphql')
  return provider
}

function setRoutes(routerPrime) {
  const router = express.Router()

  routerPrime.use('/fuel', router)

  router.post('/query', async (req, res) => {
    const { contractId, abi, method, params = [] } = req.body

    const contract = new Contract(contractId, abi, await getProvider())
    const { value } = await contract.functions[method](...params).get()
    res.json(value)
  })
}

module.exports = { setRoutes }