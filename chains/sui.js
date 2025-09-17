const HyperExpress = require("hyper-express");
const { Transaction } = require("@mysten/sui/transactions");
const { SuiClient } = require("@mysten/sui/client");
const bcs = require("@mysten/bcs");
const BigNumber = require("bignumber.js");

const suiClient = new SuiClient({
  url: "https://sui-rpc.publicnode.com",
});
const txb = new Transaction();

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router();

  routerPrime.use("/sui", router);

  router.post("/query", async (req, res) => {
    const { target, contractId, typeArguments, sender } = await req.json();

    txb.moveCall({
      target,
      arguments: [txb.object(contractId)],
      typeArguments,
    });

    const result = (
      await suiClient.devInspectTransactionBlock({
        transactionBlock: txb,
        sender,
      })
    ).results[0].returnValues.map(
      ([bytes, _]) =>
        new BigNumber(bcs.bcs.u64().parse(Uint8Array.from(bytes))),
    );

    res.json(result);
  });
}

module.exports = { setRoutes };
