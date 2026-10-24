const express = require('express')
const process = require('process')
const chains = require('./chains')

const app = express()
let server

const port = +(process.env.PORT ?? 5001)

async function main() {
  console.time('Api Server init')
  app.use(express.json({ limit: '10mb' }))
  app.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    next();
  });

  const router = express.Router()
  app.use(router)

  chains.setRoutes(router)

  server = app.listen(port, () => {
    console.timeEnd('Api Server init')
    console.log('Webserver started on port ' + port)
    // process.send('ready')
  })
  server.on('error', (e) => console.log('Failed to start webserver on port ' + port, e))
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
  if (!server) process.exit(0)
  server.close(() => {
    console.log('Server has been shut down gracefully');
    process.exit(0);
  })
}

main()
