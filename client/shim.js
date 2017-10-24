(function () {
  'use strict'

  Object.defineProperty(window, 'mocha', {
    get () {
      return undefined
    },
    set (m) {
      shimMocha(m)
      delete window.mocha
      window.mocha = m
    },
    configurable: true
  })

  Object.defineProperty(window, 'Mocha', {
    get () {
      return undefined
    },
    set (m) {
      delete window.Mocha
      window.Mocha = m

      m.process.stdout._write = function (chunks, encoding, cb) {
        var output = chunks.toString ? chunks.toString() : chunks

        window._eventbus.emit('mocha', output)

        m.process.nextTick(cb)
      }

      window._eventbus.emit('width')
    },
    configurable: true
  })

  function shimMocha (m) {
    var origRun = m.run

    m.run = function () {
      window._eventbus.emit('started', m.suite.suites.length)

      // mochaOptions is injected when starting chrome in instance.js
      m.setup(window.mochaOptions)

      m.runner = origRun.apply(window.mocha, arguments)
      if (m.runner.stats && m.runner.stats.end) {
        window._eventbus.emit('ended', m.runner.stats)
      } else {
        m.runner.on('end', () => {
          window._eventbus.emit('ended', m.runner.stats)
        })
      }
      return m.runner
    }
  }

  // Mocha needs the formating feature of console.log so copy node's format function and
  // monkey-patch it into place. This code is copied from node's, links copyright applies.
  // https://github.com/joyent/node/blob/master/lib/util.js
  if (!console.format) {
    let origError = console.error
    let origLog = console.log

    console.format = function (f) {
      if (typeof f !== 'string') {
        return Array.prototype.map.call(arguments, (arg) => {
          try {
            return JSON.stringify(arg)
          } catch (_) {
            return '[Circular]'
          }
        }).join(' ')
      }
      var i = 1
      var args = arguments
      var len = args.length
      var str = String(f).replace(/%[sdj%]/g, (x) => {
        if (x === '%%') return '%'
        if (i >= len) return x
        switch (x) {
          case '%s':
            return String(args[i++])
          case '%d':
            return Number(args[i++])
          case '%j':
            try {
              return JSON.stringify(args[i++])
            } catch (_) {
              return '[Circular]'
            }
          default:
            return x
        }
      })
      var x
      for (x = args[i]; i < len; x = args[++i]) {
        if (x === null || typeof x !== 'object') {
          str += ' ' + x
        } else {
          str += ' ' + JSON.stringify(x)
        }
      }
      return str
    }

    console.error = function () {
      origError.call(console, console.format.apply(console, arguments))
    }

    console.log = function () {
      origLog.call(console, console.format.apply(console, arguments))
    }
  }
})()
