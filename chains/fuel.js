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
    console.log('fuel query entry')
    const { contractId, abi, method, params = [] } = await req.json()
    console.log(`fuel query unpacked req: ${contractId}`)

    const contract = new Contract(contractId, abi, await getProvider())
    console.log(`fuel query contract created: ${contractId}`)
    const { value } = await contract.functions[method](...params).get()
    console.log(`fuel query result got: ${contractId}`)
    res.json(value)
    console.log(`fuel query result sent: ${contractId}`)
  })
}

module.exports = { setRoutes }