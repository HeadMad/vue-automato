/**
 * Stolen from Vue
 * @see https://github.com/vuejs/vue/blob/52719cca/src/shared/util.js
 */

const camelizeRE = /-(\w)/g;
const camelize = str => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
};

const capitalize = str => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const hyphenateRE = /\B([A-Z])/g;
const hyphenate = str => {
  return str.replace(hyphenateRE, "-$1").toLowerCase();
};

function requirePeer(name) {
  try {
    return require(name);
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND") throw e;
    throw new Error(`Module "${name}" required by "vue-automato" not found.`);
  }
}

function requireLazy(path) {
  return new Proxy(
    { path },
    {
      apply({ path }, undefined, args) {
        return require(path)(...args);
      }
    }
  );
}

const is = new Proxy(obj => Object.prototype.toString.call(obj).slice(8, -1), {
  get(target, prop) {
    return obj => target(obj) === prop
  },
  apply(target, thisArg, args) {
    return target(...args)
  }
})

if (true)
  console.log('hi')

module.exports = {
  camelize,
  capitalize,
  hyphenate,
  requirePeer,
  requireLazy,
  is
};
