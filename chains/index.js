const stellar = require('./stellar')
const injective = require('./injective')

function setRoutes(router) {
  stellar.setRoutes(router)
  injective.setRoutes(router)
}

module.exports = {
  setRoutes
}