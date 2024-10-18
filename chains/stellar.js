const HyperExpress = require('hyper-express')
const { SorobanRpc, Networks, Address, xdr, Asset, scValToNative } = require('@stellar/stellar-sdk');

const rpcUrl = 'https://soroban-rpc.creit.tech/';
const server = new SorobanRpc.Server(rpcUrl);


function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/stellar', router)

  router.get('/balances/:address', async (req, res) => {
    const { address } = req.params

    const response = await server.getContractData(
      Asset.native().contractId(Networks.PUBLIC),
      xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Balance'),
        new Address(address).toScVal(),
      ]),
      SorobanRpc.Durability.Persistent
    );
    const balance = scValToNative(response.val.value().val()).amount;
    const parsedBalance = Number(balance) / 1e7;
    res.json(parsedBalance)
  })
}

module.exports = { setRoutes }