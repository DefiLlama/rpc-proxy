const stellar = require('./stellar')
const injective = require('./injective')
const fuel = require('./fuel')

function setRoutes(router) {
  [
    stellar, injective, fuel,
  ].forEach(chain => chain.setRoutes(router))
}

module.exports = {
  setRoutes
}