const VueComponentAutoloaderPlugin = require('./lib/plugin')


class Prefixer {
  construct (prefixes) {
    this.plugin = new VueComponentAutoloaderPlugin()
  }
}