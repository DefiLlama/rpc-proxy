const HyperExpress = require("hyper-express");
const {
  rpc,
  Networks,
  Address,
  xdr,
  Asset,
  scValToNative,
  Account,
  nativeToScVal,
  TransactionBuilder,
  Contract,
} = require("@stellar/stellar-sdk");
const {
  BackstopToken,
  BackstopConfig,
  PoolV2,
  PoolV1,
} = require("@blend-capital/blend-sdk");
const sdk = require("@defillama/sdk");

const rpcUrl = "https://soroban-rpc.creit.tech/";

const network = {
  rpc: rpcUrl,
  passphrase: "Public Global Stellar Network ; September 2015",
};

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router();
  routerPrime.use("/stellar", router);

  router.get("/balances/:address", async (req, res) => {
    const { address } = req.params;

    const server = new rpc.Server(rpcUrl);
    const response = await server.getContractData(
      Asset.native().contractId(Networks.PUBLIC),
      xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol("Balance"),
        new Address(address).toScVal(),
      ]),
    );
    const balance = scValToNative(response.val.value().val()).amount;
    const parsedBalance = Number(balance) / 1e7;
    res.json(parsedBalance);
  });
  router.get("/token-balance/:token/:address", async (req, res) => {
    const { token, address } = req.params;

    try {
      res.json(await getTokenBalance(token, address));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.get("/blend-get-backstop/:backstopId", async (req, res) => {
    const { backstopId } = req.params;

    try {
      res.json(await getbackstopData(backstopId));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.get("/blend-get-pool-data/:backstopId", async (req, res) => {
    const { backstopId } = req.params;

    try {
      res.json(await getBlendPoolData(backstopId));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.get("/k2-get-pool-data/", async (_req, res) => {
    try {
      res.json(await getK2PoolData());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { setRoutes };

async function getTokenBalance(token, address) {
  const account = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGO6V",
    "123",
  );
  const tx_builder = new TransactionBuilder(account, {
    fee: "1000",
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: Networks.PUBLIC,
  });
  tx_builder.addOperation(
    new Contract(token).call(
      "balance",
      nativeToScVal(address, { type: "address" }),
    ),
  );
  const stellarRpc = new rpc.Server(rpcUrl);
  const scval_result = await stellarRpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(scval_result)) {
    const val = scValToNative(scval_result.result.retval);
    return val.toString();
  } else {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
}

const BACKCSTOP_TOKEN_ID =
  "CAS3FL6TLZKDGGSISDBWGGPXT3NRR4DYTZD7YOD3HMYO6LTJUVGRVEAM";
const USDC_ID = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const BLND_ID = "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";

async function getbackstopData(BACKSTOP_ID) {
  const api = new sdk.ChainApi({ chain: "stellar" });
  let backstopTokeData = await BackstopToken.load(
    network,
    BACKCSTOP_TOKEN_ID,
    BLND_ID,
    USDC_ID,
  );

  let totalBackstopTokens = await getTokenBalance(
    BACKCSTOP_TOKEN_ID,
    BACKSTOP_ID,
  );
  let totalBLND = Number(totalBackstopTokens) * backstopTokeData.blndPerLpToken;
  let totalUSDC = Number(totalBackstopTokens) * backstopTokeData.usdcPerLpToken;
  api.add(USDC_ID, totalUSDC);
  api.add(BLND_ID, totalBLND);
  return api.getBalances();
}

async function getBlendPoolData(BACKSTOP_ID) {
  const tvlApi = new sdk.ChainApi({ chain: "stellar" });
  const borrowedApi = new sdk.ChainApi({ chain: "stellar" });
  let backstop = await BackstopConfig.load(network, BACKSTOP_ID);
  for (const poolId of backstop.rewardZone) {
    const Pool =
      BACKSTOP_ID === "CAO3AGAMZVRMHITL36EJ2VZQWKYRPWMQAPDQD5YEOF3GIF7T44U4JAL3"
        ? PoolV1
        : PoolV2;
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
  };
}

const KINETIC_ROUTER_CONTRACT_ID = "";
const PRICE_ORACLE_CONTRACT_ID = "";
const RAY = BigInt(1e27);
const WAD = BigInt(1e18);

async function simulateInvoke(contractId, methodName, ...args) {
  const account = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGO6V",
    "123",
  );
  const txBuilder = new TransactionBuilder(account, {
    fee: "1000",
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: Networks.PUBLIC,
  });
  const contract = new Contract(contractId);
  const methodArgs = args.length ? args : [];
  txBuilder.addOperation(contract.call(methodName, ...methodArgs));
  const stellarRpc = new rpc.Server(rpcUrl);
  const result = await stellarRpc.simulateTransaction(txBuilder.build());
  if (!rpc.Api.isSimulationSuccess(result)) {
    const err = result.error || result.result?.error || "Simulation failed";
    throw new Error(
      typeof err === "object" ? JSON.stringify(err) : String(err),
    );
  }
  return scValToNative(result.result.retval);
}

async function getK2PoolData() {
  // 1. One-time: reserves list and oracle config
  const reservesList = await simulateInvoke(
    KINETIC_ROUTER_CONTRACT_ID,
    "get_reserves_list",
  );
  const reserves = Array.isArray(reservesList) ? reservesList : [reservesList];
  if (reserves.length === 0) {
    return { totalTvlUsd: "0", totalBorrowedUsd: "0", reserves: [] };
  }

  const oracleConfig = await simulateInvoke(
    PRICE_ORACLE_CONTRACT_ID,
    "get_oracle_config",
  );
  const pricePrecision = Number(
    oracleConfig?.price_precision ?? oracleConfig?.pricePrecision ?? 14,
  );
  const oracleToWad = BigInt(10 ** (18 - pricePrecision));

  // 2. Per reserve: get_current_reserve_data (view/simulate), then scaled_total_supply on aToken and debtToken
  const reserveDataList = [];
  for (const asset of reserves) {
    const assetAddress =
      typeof asset === "string"
        ? asset
        : (asset?.address ?? asset?.value ?? String(asset));
    const data = await simulateInvoke(
      KINETIC_ROUTER_CONTRACT_ID,
      "get_current_reserve_data",
      new Address(assetAddress).toScVal(),
    );
    reserveDataList.push({ assetAddress, data });
  }

  const aTokenSupplies = [];
  const debtTokenSupplies = [];
  for (const { data } of reserveDataList) {
    const aTokenAddr = data?.a_token_address ?? data?.aTokenAddress;
    const debtTokenAddr = data?.debt_token_address ?? data?.debtTokenAddress;
    if (!aTokenAddr || !debtTokenAddr) {
      aTokenSupplies.push(BigInt(0));
      debtTokenSupplies.push(BigInt(0));
      continue;
    }
    const [aSupply, dSupply] = await Promise.all([
      simulateInvoke(aTokenAddr, "scaled_total_supply"),
      simulateInvoke(debtTokenAddr, "scaled_total_supply"),
    ]);
    aTokenSupplies.push(BigInt(aSupply?.toString?.() ?? aSupply ?? 0));
    debtTokenSupplies.push(BigInt(dSupply?.toString?.() ?? dSupply ?? 0));
  }

  // 3. Prices batch: get_asset_prices_vec(assets) with Asset::Stellar(addr) in same order as reserves
  const assetsVec = xdr.ScVal.scvVec(
    reserves.map((asset) => {
      const addr =
        typeof asset === "string"
          ? asset
          : (asset?.address ?? asset?.value ?? String(asset));
      return xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol("Stellar"),
        new Address(addr).toScVal(),
      ]);
    }),
  );
  const pricesResult = await simulateInvoke(
    PRICE_ORACLE_CONTRACT_ID,
    "get_asset_prices_vec",
    assetsVec,
  );
  const prices = Array.isArray(pricesResult) ? pricesResult : [pricesResult];

  // 4. Math per reserve, then sum
  let totalTvlBase = BigInt(0);
  let totalBorrowedBase = BigInt(0);
  const reserveSummaries = [];

  for (let i = 0; i < reserveDataList.length; i++) {
    const { assetAddress, data } = reserveDataList[i];
    const liquidityIndex = BigInt(
      data?.liquidity_index?.toString?.() ?? data?.liquidityIndex ?? 0,
    );
    const variableBorrowIndex = BigInt(
      data?.variable_borrow_index?.toString?.() ??
        data?.variableBorrowIndex ??
        0,
    );
    const config = data?.configuration ?? data?.config ?? {};
    const decimals = Number(config?.decimals ?? config?.get_decimals ?? 8);
    const decimalsPow = BigInt(10 ** decimals);

    const scaledSupply = aTokenSupplies[i] ?? BigInt(0);
    const scaledDebt = debtTokenSupplies[i] ?? BigInt(0);
    const totalSupplyRaw = (scaledSupply * liquidityIndex) / RAY;
    const totalDebtRaw = (scaledDebt * variableBorrowIndex) / RAY;

    const priceData = prices[i];
    const price = BigInt(
      priceData?.price?.toString?.() ?? priceData?.price ?? 0,
    );
    const valueSupplyBase =
      (totalSupplyRaw * price * oracleToWad) / decimalsPow;
    const valueDebtBase = (totalDebtRaw * price * oracleToWad) / decimalsPow;

    totalTvlBase += valueSupplyBase;
    totalBorrowedBase += valueDebtBase;
    reserveSummaries.push({
      asset: assetAddress,
      totalSupplyRaw: totalSupplyRaw.toString(),
      totalDebtRaw: totalDebtRaw.toString(),
      tvlBase: valueSupplyBase.toString(),
      borrowedBase: valueDebtBase.toString(),
    });
  }

  const totalTvlUsd = (Number(totalTvlBase) / Number(WAD)).toFixed(18);
  const totalBorrowedUsd = (Number(totalBorrowedBase) / Number(WAD)).toFixed(
    18,
  );

  return {
    totalTvlUsd,
    totalBorrowedUsd,
    totalTvlBase: totalTvlBase.toString(),
    totalBorrowedBase: totalBorrowedBase.toString(),
    reserves: reserveSummaries,
  };
}
