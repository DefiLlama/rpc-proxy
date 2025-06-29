const chains = {
  stellar: require('./stellar'),
  injective: require('./injective'),
  fuel: require('./fuel'),
  ripple: require('./ripple'),
  kamino: require('./kamino'),
  drift: require('./drift'),
  beacon: require('./beacon'),
}

function setRoutes(router) {
  // load cache
  chains.beacon.getValidators()
    
  Object.entries(chains).forEach(([chain, { setRoutes }]) => {
    console.log(`Setting routes for ${chain}`)
    setRoutes(router)
  })
}

module.exports = {
  setRoutes
}