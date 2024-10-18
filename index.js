const fs = require('fs')
const HyperExpress = require('hyper-express')
const process = require('process')
const chains = require('./chains')

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)

async function main() {
  console.time('Api Server init')
  webserver.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    next();
  });

  const router = new HyperExpress.Router()
  webserver.use(router)

  chains.setRoutes(router)

  webserver.listen(port)
    .then(() => {
      console.timeEnd('Api Server init')
      console.log('Webserver started on port ' + port)
      process.send('ready')
    })
    .catch((e) => console.log('Failed to start webserver on port ' + port, e))
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (e) => {
  console.error('Uncaught exception', e)
  shutdown()
})

function shutdown() {
  console.log('Shutting down gracefully...');
  setTimeout(() => process.exit(0), 5000); // wait 5 seconds before forcing shutdown
  webserver.close(() => {
    console.log('Server has been shut down gracefully');
    process.exit(0);
  })
}

main()
