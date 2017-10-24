const chai = require('chai')
const execa = require('execa')
const path = require('path')
const {describe, it} = require('mocha')

const cli = (args, opts) => execa(path.join(cwd, 'bin/mocha-headless-chrome'), args, opts)
const cwd = path.dirname(__dirname)
const expect = chai.expect
const pkg = require(path.join(cwd, 'package.json'))

describe('mocha-headless-chrome', () => {
  it('should report version', (done) => {
    cli(['--version'], {cwd}).then(({stdout}) => {
      expect(stdout).to.equal(pkg.version)
      done()
    })
  })

  it('should run a successful test', (done) => {
    cli(['test/html/test.html'], {cwd}).then(({code}) => {
      expect(code).to.equal(0)
      done()
    })
  })

  it('should run a failing test', (done) => {
    cli(['test/html/fail.html'], {cwd}).catch(err => {
      expect(err.code).to.equal(1)
      expect(err.stdout).to.match(/1 failing/)
      done()
    })
  })
})
