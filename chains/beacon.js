const fs = require('fs');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');
const { streamArray } = require('stream-json/streamers/StreamArray')
const { pick } = require('stream-json/filters/Pick');
const { parser } = require('stream-json');
const HyperExpress = require('hyper-express');

const CACHE_FILE = path.join(__dirname, 'beacon_validators_cache.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let updateInProgress = false;
let cacheData = null;

// Helper to read cache file
function readCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw)
      return parsed;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Helper to write cache file
function writeCache(data) {
  cacheData = {
    timestamp: Date.now(),
    data
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
}

// Fetch validators from the API and cache them
async function updateCache() {
  if (!updateInProgress)
    updateInProgress = fetchValidatorsStream().then(data => {
      writeCache(data);
    }).catch(e => {
      console.error('Error fetching validators:', e)
    }).then(() => {
      updateInProgress = false;
    });
  return updateInProgress;
}

// Stream-fetch the validators data
function fetchValidatorsStream() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    https.get('https://ethereum-beacon-api.publicnode.com/eth/v1/beacon/states/head/validators', options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Status code: ${res.statusCode}`));
        res.resume();
        return;
      }
      // Use stream-json to efficiently parse and filter the 'data' array
      const items = {}
      const pipelineStream = pipeline(
        res,
        parser(),
        pick({ filter: 'data' }),
        streamArray(),
        async function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(items);
        }
      );

      let i = 0
      pipelineStream.on('data', ({ value }) => {
        ++i

        if (i % 10000 === 0) {
          console.log(`Processed ${i / 1e6}M validators...`);
        }

        let withdrawalCredentials = value.validator.withdrawal_credentials.slice(-40).toLowerCase()
        if (!items[withdrawalCredentials])
          items[withdrawalCredentials] = { b: 0, vc: 0 }
        items[withdrawalCredentials].b += +value.balance
        items[withdrawalCredentials].vc += 1

      })
      res.on('end', () => {
        try {
          resolve(items);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Main function to get validators, updating cache if needed
async function getValidators() {
  if (!cacheData)
    cacheData = readCache();

  const now = Date.now();
  let updatingCache = false;
  if (!cacheData || !cacheData.timestamp || (now - cacheData.timestamp > CACHE_TTL_MS))
    updatingCache = updateCache()

  // if cache is being generated, wait for it to finish, but if we already have cache data, return it
  if (!cacheData && updatingCache)
    await updatingCache;

  if (!cacheData)
    cacheData = readCache();

  return cacheData.data
}


function setRoutes(routerPrime) {
  const router = new HyperExpress.Router()
  routerPrime.use('/beacon', router)

  router.get('/total_staked', async (req, res) => {
    let { withdrawal_credentials = '' } = req.query
    withdrawal_credentials = withdrawal_credentials.split(',').map(vc => vc.trim().toLowerCase().slice(-40))

    try {
      const cache = await getValidators()
      const response = {
        total_balance: 0,
        total_balance_formatted: 0,
        metadata: {}
      }

      withdrawal_credentials.forEach(wc => {
        const validator = cache[wc]
        if (validator) {
          response.total_balance += validator.b
          response.total_balance_formatted += validator.b / 1e9
          response.metadata['0x' + wc] = validator
        }
      })
      return res.json(response)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })
}


module.exports = {
  setRoutes,
  getValidators
}
