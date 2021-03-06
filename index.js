'use strict'

const createInstance = require('./lib/instance')
const connectClient = require('./lib/client')
const EventBus = require('./lib/event-bus')
const chromeOut = require('./lib/chrome-out')
const network = require('./lib/network')

const deepAssign = require('deep-assign')
const log = require('loglevel')
const unmirror = require('chrome-unmirror')

class MochaChrome {
  constructor (options) {
    options = deepAssign({
      chromeFlags: [],
      loadTimeout: 1000,
      logLevel: 'error',
      ignoreExceptions: false,
      ignoreConsole: false,
      ignoreResourceErrors: false,
      mocha: {
        reporter: 'spec',
        ui: 'bdd',
        useColors: true
      }
    }, options)

    log.setDefaultLevel('error')
    log.setLevel(options.logLevel)

    if (!options.url) {
      this.fail('`options.url` must be specified to run tests')
    }

    this.options = options
    this.loadError = false
    this.bus = new EventBus(log)
    this.listenBus()
  }

  listenBus () {
    this.bus.on('width', content => {
      const columns = parseInt(process.env.COLUMNS || process.stdout.columns) * 0.75 | 0
      const expression = `Mocha.reporters.Base.window.width = ${columns};`

      this.client.Runtime.evaluate({ expression })
    })

    this.bus.on('started', (tests) => {
      this.started = true
      log.info(`Test Run Started - Running ${tests} Tests\n`)

      if (tests === 0) {
        this.fail('mocha.run() was called with no tests')
      }
    })

    this.bus.on('ended', stats => {
      this.ended = true
      this.exit(stats.failures)
    })

    this.bus.on('resourceFailed', data => {
      this.loadError = true
    })
  }

  connect () {
    return new Promise((resolve, reject) => {
      createInstance(log, this.options).then((instance) => {
        connectClient(instance, log, this.options)
          .then((client) => {
            const {DOMStorage, Network, Runtime} = client

            if (!client) {
              this.fail('CDP Client could not connect')
              return
            }

            this.bus.watch(DOMStorage)

            chromeOut(log, this.options, Runtime)
            network(this.bus, log, Network, this.options.ignoreResourceErrors)

            this.client = client
            this.instance = instance

            resolve()
          })
          .catch(reject)
      }).catch(reject)
    })
  }

  run () {
    this.client.Page.loadEventFired(() => {
      if (this.closed) {
        return
      }

      if (this.loadError) {
        this.fail('Failed to load the page. Check the url: ' + this.options.url)
        return
      }

      setTimeout(() => {
        if (this.closed) {
          return
        }

        const expression = '(function () { return !!window.mocha; })()'
        this.client.Runtime.evaluate({expression})
          .then((res) => {
            if (!unmirror(res.result)) {
              this.fail(`mocha was not found in the page within ${this.options.loadTimeout}ms of the page loading.`)
            }

            if (!this.started) {
              this.fail(`mocha.run() was not called within ${this.options.loadTimeout}ms of the page loading.`)
            }
          })
      }, this.options.loadTimeout)
    })

    return this.client.Page.navigate({url: this.options.url})
  }

  on (name, fn) {
    this.bus.on(name, fn)
  }

  fail (message) {
    log.error('Mocha-Chrome Failed:', message || '')

    if (this.bus) {
      this.bus.emit('failure', message)
    }

    this.exit(1)
  }

  exit (code) {
    this.closed = true
    this.client.close()
      .then(() => this.instance.kill())
      .then(() => {
        this.bus.emit('exit', code)
      })
  }
}

module.exports = MochaChrome
