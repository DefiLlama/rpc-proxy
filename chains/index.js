const stellar = require('./stellar')
const injective = require('./injective')
const fuel = require('./fuel')
const ripple = require('./ripple')

function setRoutes(router) {
  [
    stellar, injective, fuel, ripple,
  ].forEach(chain => chain.setRoutes(router))
}

module.exports = {
  setRoutes
}