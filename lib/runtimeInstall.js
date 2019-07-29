// IMPORTANT: Do NOT use ES2015 features in this file (except for modules).
// This module is a runtime utility for cleaner component module output and will
// be included in the final webpack user bundle.

module.exports = function runtimeInstall (component) {
  return function (type, value) {
    var options = typeof component.exports === 'function'
      ? component.exports.extendOptions
      : component.options

    if (typeof component.exports === 'function') {
      options[type] = component.exports.options[type]
    }

    // options[type] = options[type] || {}

    if (type !== 'mixins') {
      options[type] = value
      
    } else {
      options.mixins = options.mixins || []
      options.mixins = options.mixins.concat(value)
    }

    // for (var i in value) {
    //   options[type][i] = options[type][i] || value[i]
    // }
  }
}
