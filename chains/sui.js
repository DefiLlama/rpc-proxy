const express = require("express");
const { Transaction } = require("@mysten/sui/transactions");
const { SuiClient } = require("@mysten/sui/client");
const bcs = require("@mysten/bcs");
const BigNumber = require("bignumber.js");

const suiClient = new SuiClient({
  url: "https://sui-rpc.publicnode.com",
});

function setRoutes(routerPrime) {
  const router = express.Router();

  routerPrime.use("/sui", router);

  router.post("/query", async (req, res) => {
    const { target, contractId, typeArguments, sender } = req.body;

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
  });
}

module.exports = { setRoutes };
