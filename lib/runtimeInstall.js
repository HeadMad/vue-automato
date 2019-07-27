// IMPORTANT: Do NOT use ES2015 features in this file (except for modules).
// This module is a runtime utility for cleaner component module output and will
// be included in the final webpack user bundle.

module.exports = function runtimeInstall (type, component, items) {
  var options = typeof component.exports === 'function'
  ? component.exports.extendOptions
  : component.options

  if (typeof component.exports === 'function') {
    options[type] = component.exports.options[type]
  }

  options[type] = options[type] || {}

  for (var i in items) {
    options[type][i] = options[type][i] || items[i]
  }
}
