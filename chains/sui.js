const HyperExpress = require("hyper-express");
const { Transaction } = require("@mysten/sui/transactions");
const { SuiClient } = require("@mysten/sui/client");
const bcs = require("@mysten/bcs");
const BigNumber = require("bignumber.js");

const suiClient = new SuiClient({
  url: "https://sui-rpc.publicnode.com",
});

function setRoutes(routerPrime) {
  const router = new HyperExpress.Router();

  routerPrime.use("/sui", router);

  router.post("/query", async (req, res) => {
    try {
      const { target, contractId, typeArguments, sender } = await req.json();

      if (!target || !contractId || !sender) {
        return res.status(400).json({ error: "target, contractId and sender are required" });
      }

      const txb = new Transaction();

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
    } catch (e) {
      console.error("[sui] /query error:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

module.exports = { setRoutes };
