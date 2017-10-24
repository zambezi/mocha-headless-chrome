# mocha-headless-chrome

Run Mocha tests using headless Google Chrome.

This tool is a fork of https://github.com/shellscape/mocha-chrome. It adds support of Node.JS 6.x as well as fixing few quirks.

## Getting Started

To begin, you'll need to install `mocha-chrome`:

```console
$ npm install @zambezi/mocha-headless-chrome --save-dev
```

Then you'll need a local npm install of mocha:

```console
$ npm install mocha --save-dev
```

To run the tests, you'll need an HTML file with some basics:

```html
<!doctype>
<html>
  <head>
    <title>Test</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="../node_modules/mocha/mocha.css" />
    <script src="../node_modules/mocha/mocha.js"></script>
    <script src="../node_modules/chai/chai.js"></script>
  </head>
  <body>
    <div id="mocha"></div>
    <script>
      expect = chai.expect;
      mocha.setup('bdd')
      
      // add tests here

      mocha.run();
    </script>
  </body>
</html>

```

You can then add your tests either through an external script file or
inline within a `<script>` tag. Running the tests is easy, either with the CLI
binary, or programmatically.

## CLI

```console
$ mocha-headless-chrome --help

  Usage
    $ mocha-headless-chrome <file.html> [options]

  Options
    --mocha      A JSON string representing a config object to pass to Mocha
    --log-level  Specify a log level; trace, debug, info, warn, error
    --no-colors  Disable colors in Mocha's output
    --reporter   Specify the Mocha reporter to use
    --timeout    Specify the test startup timeout to use

  Examples
    $ mocha-headless-chrome test.html --no-colors
    $ mocha-headless-chrome test.html --reporter dot
    $ mocha-headless-chrome test.html --mocha '{"ui":"tdd"}'
```


### Reporters

Third party reporter have to be loaded within the page to be used. For instance to use `mocha-teamcity-reporter` ;

- Install the reporter `npm install mocha-teamcity-reporter --save-dev`.
- Modify the HTML page to add a script tag:

```html
<!doctype>
<html>
  <head>
    <title>Test</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="../node_modules/mocha/mocha.css" />
    <script src="../node_modules/mocha/mocha.js"></script>
    <script src="../node_modules/chai/chai.js"></script>
    <script src="../node_modules/mocha-teamcity-reporter/lib/teamcity.js"></script>
  </head>
  <body>
    <div id="mocha"></div>
    <script>
      expect = chai.expect;
      mocha.setup('bdd')
      
      // add tests here

      mocha.run();
    </script>
  </body>
</html>
```

The custom reporter can be used with the `--reporter` CLI argument

```
mocha-headless-chrome test.html --reporter teamcity
```


### Cookies and the `file://` Protocol

Chrome has long-since disabled cookies for files loaded via the `file://` protocol.
The once-available `--enable-file-cookies` has been removed and we're left with few options.
If you're in need of cookie support for your local-file test, you may use the following snippet,
which will shim `document.cookie` with _very basic_ support:

```js
  Object.defineProperty(document, 'cookie', {
    get: function () {
      return this.value || '';
    },
    set: function (cookie) {
      cookie = cookie || '';

      const cutoff = cookie.indexOf(';');
      const pair = cookie.substring(0, cutoff >= 0 ? cutoff : cookie.length);
      const cookies = this.value ? this.value.split('; ') : [];

      cookies.push(pair);

      return this.value = cookies.join('; ');
    }
  });
```

## Testing mocha-headless-chrome

```console
$ npm test
```