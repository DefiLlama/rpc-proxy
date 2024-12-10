const chains = {
  stellar: require('./stellar'),
  injective: require('./injective'),
  fuel: require('./fuel'),
  ripple: require('./ripple'),
  kamino: require('./kamino'),
}

function setRoutes(router) {
  Object.entries(chains).forEach(([chain, { setRoutes }]) => {
    console.log(`Setting routes for ${chain}`)
    setRoutes(router)
  })
}

module.exports = {
  setRoutes
}