const VueComponentAutoloaderPlugin = require('./lib/plugin')
const { camelize, capitalize, hyphenate } = require('./utils')
const checkComponent = require('./lib/checkComponent.js')

const def = function({camelTag}, {name, path}) {

  if (!checkComponent('./src' + path, name, '.vue'))
    return false

  return {
    comp: camelTag,
    from: `@${path + name}.vue`
  }
}

module.exports = function (prefixes) {
  return new VueComponentAutoloaderPlugin({
    match ({tag: originalTag, ...node}, opts) {

      let kebabTag = hyphenate(originalTag)
      let camelTag = capitalize(camelize(originalTag))

      for (const prefix in prefixes) {
        if (!kebabTag.startsWith(prefix)) continue

        opts.prefix = prefix
        opts.name = kebabTag.substring(prefix.length)
        opts.def = def
        opts.prefixes = prefixes
        
        if (typeof prefixes[prefix] === "function")
          return prefixes[prefix]({originalTag, kebabTag, camelTag}, opts, node)
        
        opts.path = prefixes[prefix] + opts.name.split('-', 1)[0] + '/'
        return def({originalTag, kebabTag, camelTag}, opts, node)
      }
    }
  })
}

