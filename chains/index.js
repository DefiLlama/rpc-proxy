const chains = {
  stellar: require('./stellar'),
  injective: require('./injective'),
  fuel: require('./fuel'),
  ripple: require('./ripple'),
  kamino: require('./kamino'),
  drift: require('./drift'),
  beacon: require('./beacon'),
  sui: require('./sui'),
}

function setRoutes(router) {
  // load cache
  chains.beacon.getValidators().catch((e) => console.error('Failed to warm beacon validator cache', e))
    
  Object.entries(chains).forEach(([chain, { setRoutes }]) => {
    console.log(`Setting routes for ${chain}`)
    setRoutes(router)
  })
}

module.exports = {
  setRoutes
}