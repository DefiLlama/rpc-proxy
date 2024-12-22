const { Connection, Keypair } = require("@solana/web3.js");
const { AnchorProvider, Program } = require('@project-serum/anchor');
const { DriftClient } = require('@drift-labs/sdk');
const { IDL, VAULT_PROGRAM_ID, VaultClient } = require("@drift-labs/vaults-sdk");
const HyperExpress = require('hyper-express');
const { PublicKey } = require("@solana/web3.js");

let initialized, client, client_jlpdnv1

const JLPDN_PROGAM_ID_V1 = "" // TODO: figure out JLPDN_PROGAM_ID_V1
const vaultTvls = {}

async function getCachedVaultTvl(vault, version) {
  const cacheDuration = 20 * 60 * 60 * 1000 // 20 hours in milliseconds
  const now = Date.now()
  let { cachedTvl, cacheTimestamp } = vaultTvls[vault] || {}

  if (cachedTvl && cacheTimestamp && (now - cacheTimestamp < cacheDuration))
    return cachedTvl

  if (!initialized)
    initialized = initialize()

  await initialized

  cachedTvl = getTvl()
  cacheTimestamp = now
  vaultTvls[vault] = { cachedTvl, cacheTimestamp }
  return cachedTvl

  async function getTvl() {
    const _client = version == 1 ? client_jlpdnv1 : client
    const vaultInstance = await _client.getVault(new PublicKey(vault));
    const token_tvl = await _client.calculateVaultEquityInDepositAsset({
      address: vault,
      vault: vaultInstance,
      factorUnrealizedPNL: true,
    });
    return Number(token_tvl);
  }
}


/// INIT DRIFT SDK
const initialize = async () => {
  const connection = new Connection('https://cold-hanni-fast-mainnet.helius-rpc.com/');
  const wallet = Keypair.generate();
  const initializeDriftClient = async () => {
    const driftClient = new DriftClient({
      connection,
      wallet,
      env: "mainnet-beta",
    });
    await driftClient.subscribe();
    return driftClient;
  };
  const initializeProgram = (version) => {
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    return new Program(
      IDL,
      // version == 1 ? JLPDN_PROGAM_ID_V1 : VAULT_PROGRAM_ID, // figure out JLPDN_PROGAM_ID_V1 & set it here
      VAULT_PROGRAM_ID,
      provider
    );
  };
  const initializeVaultClient = async (version) => {
    return new VaultClient({
      driftClient: await initializeDriftClient(),
      program: initializeProgram(version),
      cliMode: true,
    });
  };
  client = await initializeVaultClient();
  client_jlpdnv1 = await initializeVaultClient(1);
};

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/drift', router)

  router.get('/vault_tvl', async (req, res) => {
    const { version, vault } = req.query
    try {
      const tvl = await getCachedVaultTvl(vault, version)
      return res.json(tvl)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })
}

module.exports = { setRoutes }