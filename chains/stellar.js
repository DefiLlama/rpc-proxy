const HyperExpress = require('hyper-express')
const { rpc, Networks, Address, xdr, Asset, scValToNative, Account, nativeToScVal, TransactionBuilder, Contract } = require('@stellar/stellar-sdk');
const { BackstopToken, BackstopConfig, PoolV2, PoolV1 } = require('@blend-capital/blend-sdk');
const sdk = require('@defillama/sdk')

const rpcUrl = 'https://soroban-rpc.creit.tech/';

const network = {
  rpc: rpcUrl,
  passphrase: "Public Global Stellar Network ; September 2015",
};

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/stellar', router)

  router.get('/balances/:address', async (req, res) => {
    const { address } = req.params

    const server = new rpc.Server(rpcUrl);
    const response = await server.getContractData(
      Asset.native().contractId(Networks.PUBLIC),
      xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Balance'),
        new Address(address).toScVal(),
      ]),
    );
    const balance = scValToNative(response.val.value().val()).amount;
    const parsedBalance = Number(balance) / 1e7;
    res.json(parsedBalance)
  })
  router.get('/token-balance/:token/:address', async (req, res) => {
    const { token, address } = req.params

    try {
      res.json(await getTokenBalance(token, address));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  router.get('/blend-get-backstop/:backstopId', async (req, res) => {
    const { backstopId } = req.params

    try {
      res.json(await getbackstopData(backstopId));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  router.get('/blend-get-pool-data/:backstopId', async (req, res) => {
    const { backstopId } = req.params

    try {
      res.json(await getBlendPoolData(backstopId));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
}

module.exports = { setRoutes }

async function getTokenBalance(token, address) {
  const account = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGO6V', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: Networks.PUBLIC,
  });
  tx_builder.addOperation(new Contract(token).call('balance', nativeToScVal(address, { type: 'address' })));
  const stellarRpc = new rpc.Server(rpcUrl);
  const scval_result = await stellarRpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(scval_result)) {
    const val = scValToNative(scval_result.result.retval)
    return val.toString()
  } else {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
}

const BACKCSTOP_TOKEN_ID = "CAS3FL6TLZKDGGSISDBWGGPXT3NRR4DYTZD7YOD3HMYO6LTJUVGRVEAM";
const USDC_ID = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const BLND_ID = "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";

async function getbackstopData(BACKSTOP_ID) {
  const tvlApi = new sdk.ChainApi({ chain: 'stellar' });
  let backstopTokeData = await BackstopToken.load(network, BACKCSTOP_TOKEN_ID, BLND_ID, USDC_ID);

  let totalBackstopTokens = await getTokenBalance(BACKCSTOP_TOKEN_ID, BACKSTOP_ID);
  let totalBLND = Number(totalBackstopTokens) * backstopTokeData.blndPerLpToken;
  let totalUSDC = Number(totalBackstopTokens) * backstopTokeData.usdcPerLpToken;
  api.add(USDC_ID, totalUSDC);
  api.add(BLND_ID, totalBLND);
  return api.getBalances()
}

async function getBlendPoolData(BACKSTOP_ID) {
  const tvlApi = new sdk.ChainApi({ chain: 'stellar' });
  const borrowedApi = new sdk.ChainApi({ chain: 'stellar' });
  let backstop = await BackstopConfig.load(network, BACKSTOP_ID);
  for (const poolId of backstop.rewardZone) {
    const Pool = BACKSTOP_ID === 'CAO3AGAMZVRMHITL36EJ2VZQWKYRPWMQAPDQD5YEOF3GIF7T44U4JAL3' ? PoolV1 : PoolV2;
    let pool = await Pool.load(network, poolId);

    for (const [reserveId, reserve] of Array.from(pool.reserves)) {
      const supply = reserve.totalSupply();
      const borrowed = reserve.totalLiabilities();
      tvlApi.add(reserveId, supply - borrowed);
      borrowedApi.add(reserveId, borrowed);
    }
  }

  return {
    tvl: tvlApi.getBalances(),
    borrowed: borrowedApi.getBalances(),
  }
}