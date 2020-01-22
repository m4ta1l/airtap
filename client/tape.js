var load = require('load-script')
var engineClient = require('engine.io-client')

// Without Developer Tools open, console is undefined in IE9.
if (typeof global.console === 'undefined') {
  global.console = {}
}

var container = document.getElementById('airtap')
var colors = { pending: '#e4a533', fail: '#d83131', ok: '#69cf69' }
var socket = engineClient('ws://' + window.location.host + '/engine.io')

socket.on('open', function () {
  socket.on('message', function (json) {
    var msg = JSON.parse(json)

    if (msg.type === 'complete') {
      status(msg.ok ? colors.ok : colors.fail)
      send({ type: 'complete', coverage: window.__coverage__ }, function () {
        socket.close()
      })
    }
  })

  global.console.log = wrap(global.console.log, 'log')
  global.console.error = wrap(global.console.error, 'error')

  window.onerror = onerror

  load('/airtap/test.js', function (err) {
    if (err) {
      status(colors.fail)
      throw err
    }

    status(colors.pending)
  })

  function send (msg, ondrain) {
    if (msg.type === 'console' && msg.level === 'log') {
      var code = container.appendChild(document.createElement('code'))
      code.textContent = msg.args.join(' ')
    }

    socket.send(JSON.stringify(msg), ondrain)
  }

  function status (color) {
    document.body.style.backgroundColor = color
  }

  function wrap (original, level) {
    return function log () {
      send({ type: 'console', level: level, args: [].slice.call(arguments) })

      // In IE9 this is an object that doesn't have Function.prototype.apply
      if (typeof original === 'function') {
        return original.apply(this, arguments)
      }
    }
  }

  function onerror (message, source, lineno, colno, error) {
    send({
      type: 'error',
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      error: {
        name: error && error.name,
        stack: error && error.stack
      }
    })
  }
})
