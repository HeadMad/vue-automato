const path = require('path')
const loaderUtils = require('loader-utils')
const compiler = require('vue-template-compiler')

const { requirePeer, camelize, capitalize, hyphenate } = require('./util')
const instalatorPath = require.resolve('./lib/runtimeInstall.js')


/* HELPERS START */
function _makeInstallsArray(imports) {
  let installs = imports.reduce((inst, imp) => {
    if (!imp.install || !imp.name) return inst

    let i = imp.install
    let n = imp.name

    if (!inst[i]) inst[i] = [n]
    if (inst[i].indexOf(n) === -1) inst[i].push(n)
    return inst
  }, {})

  let result = []
  for (let i in installs) {
    result.push(`runtimeInstall("${i}", component, {${installs[i].join(',')}})`)
  }

  return result
}

function _makeCodesArray(imports) {
  let codes = imports.reduce((res, imp) => {
    if (imp.code && imp.name)
      res.push(`const ${imp.name} = ${imp.code}`)

    else if (imp.code)
      res.push(imp.code)

    else if (imp.src && imp.name)
      res.push(`import ${imp.name} from "${imp.src}"`)

    return res
  }, [])

  return codes
}
/* HELPERS END */


function getMatches (items, matches) {
  const imports = []

  let ghost = {}
  items.forEach(({tag, node, ...params}) => {
    for (let matcher of matches) {

      ghost.rootPath = this.rootContext
      ghost.filePath = this.resourcePath.substring(this.rootContext.length + 1)

      let match = matcher(tag, params, node, ghost)
      if (!match) continue

      imports.push(match)
    }
    
  });

  return imports
}

function install (content, imports) {
  if (!imports.length) return content
  
  let hotReload = '/* hot reload */'

  let runtimeInstall = imports.some(imp => imp.install && imp.name)
  ? 'import runtimeInstall from ' + loaderUtils.stringifyRequest(this, '!' + instalatorPath)
  : ''

  let installs = _makeInstallsArray(imports)
  let codes = _makeCodesArray(imports)
  
  let newContent = [
    '/* vue-automato */',
    ...[runtimeInstall],
    ...codes,
    ...installs,
    '\n',
    hotReload
  ].join('\n')

  // Insert our modification before the HMR code
  if (content.indexOf(hotReload) !== -1) {
    content = content.replace(hotReload, newContent)
  } else {
    content += '\n\n' + newContent
  }

  return content
}

module.exports = async function (content, sourceMap) {
  this.async()
  this.cacheable()

  const options = {
    match: [],
    ...loaderUtils.getOptions(this)
  }

  if (!Array.isArray(options.match)) options.match = [options.match]

  if (this.resourceQuery)
    return null
    
  const readFile = path => new Promise((resolve, reject) => {
    this.fs.readFile(path, function (err, data) {
      if (err) reject(err)
      else resolve(data)
    })
  })
  
  this.addDependency(this.resourcePath)
  
  const file = (await readFile(this.resourcePath)).toString('utf8')
  const component = compiler.parseComponent(file)
  
  if (!component.template)
    return null

  if (component.template.src) {
    const externalFile = path.resolve(path.dirname(this.resourcePath), component.template.src);
    const externalContent = (await readFile(externalFile)).toString('utf8')
    component.template.content = externalContent
  }
  if (component.template.lang === 'pug') {
    const pug = requirePeer('pug')
    try {
      component.template.content = pug.render(component.template.content)
    } catch (err) {/* Ignore compilation errors, they'll be picked up by other loaders */}
  }

  const installNodes = []
  compiler.compile(component.template.content, {
    modules: [{
      postTransformNode: node => {
        let tag, props, directives, className

        // get original tag and modifications
        tag = {
          rawTag: node.tag,
          kebabTag: hyphenate(node.tag),
          camelTag: capitalize(camelize(node.tag))
        }

        if (node.directives) {
          directives = node.directives.map(({name, arg, isDynamicArg, modifiers, value}) => {
            let mods
            if (modifiers) {
              mods = []
              for (const mod in modifiers) 
              mods.push(mod)
            }
            
            return {name, arg, isDynamicArg, mods, value}
          })
        }

        // get props of tag
        if (node.attrs) {
          props = node.attrs.map(attr => {
            let name = attr.name
            let isBinded = attr.dynamic !== undefined
            let value = !isBinded ? node.attrsMap[name] : node.attrsMap[':' + name] ? node.attrsMap[':' + name] : node.attrsMap['v-bind:' + name]
            return {name, value, isBinded}
          })
        }

        if (node.staticClass) {
          className = node.attrsMap.class.trim().split(' ')
        }

        installNodes.push({tag, className, props, directives, node})
      }
    }]
  })

  content = install(content, getMatches.call(this, installNodes, options.match))
  this.callback(null, content, sourceMap)
}