const path = require('path')
const loaderUtils = require('loader-utils')
const compiler = require('vue-template-compiler')

const { requirePeer, camelize, capitalize, hyphenate, is } = require('./util')
const instalatorPath = require.resolve('./lib/runtimeInstall.js')


/* HELPERS START */

function _wrapInstallNames(install, names) {
  let namesString
  if (['components', 'props', 'directives',
  'filters', 'methods', 'computed'].indexOf(install) !== -1) {
    namesString = '{' + names.join(',') + '}'

  } else if (install === 'mixins' || names.length > 1) {
    install = 'mixins'
    namesString = '[' + names.join(',') + ']'

  } else {
    namesString = names
  }

  return [install, namesString]
}

function _makeInstallsArray(installs) {
  // remove duplicates from installs
  let installsArray = installs.reduce((res, {install, value}) => {
    if (!res[install]) {
      res[install] = [value]
      return res
    }
    if (res[install].indexOf(value) === -1)
      res[install].push(value)

    return res
  }, {})

  let result = []
  for (let install in installsArray) {
    let wrap = _wrapInstallNames(install, installsArray[install])

    result.push(`runtimeInstall("${wrap[0]}", ${wrap[1]})`)
  }

  return result
}

// define the implantable code
function _makeInsertedCodeArray(imports) {
  let codes = imports.reduce((res, {install, name, code, src}) => {
    let push
    if (!install) {                                        // !install
      if (code) res.codes.push(code)                       // !install && code   

    } else if (name) {                                     // install && name
      if (src) {                                           // install && name && src
        res.imports.push(`import ${name} from "${src}"`)
        res.installs.push({install, value: name})

        if (code) res.codes.push(code)                     // install && name && src && code
        
      } else if (code) {                                   // install && name && !src && code
        res.consts.push(`const ${name} = ${code}`)
        res.installs.push({install, value: name})
      } 
      
    } else if (src) {                                      // install && !name && src
      res.installs.push({install, value: src})
      if (code) res.codes.push(code)                       // install && !name && src && code
      
    } else if (code) {                                     // install && !name && !src && code 
      res.installs.push({install, value: code})
    }

    return res
  }, {imports: [], consts: [], codes:[], installs: []})

  codes.installs = _makeInstallsArray(codes.installs)
  return codes
}
/* HELPERS END */


function getMatches (items, matches) {
  let imports = []

  let ghost = {}
  items.forEach(({tag, node, ...params}) => {
    for (let matcher of matches) {

      ghost.rootPath = this.rootContext
      ghost.filePath = this.resourcePath.substring(this.rootContext.length + 1)

      let match = matcher(tag, params, node, ghost)
      if (!match) continue

      if (Array.isArray(match))
      imports = imports.concat(match)

      else
      imports.push(match)
    }
  });

  // remove imports with same names
  let filtredImports = imports.filter(function({name}) {
    if (!name) return true
    if (this.indexOf(name) !== -1) return false
    this.push(name)
    return true
  }, [])

  return filtredImports
}

function install (content, imports) {
  if (!imports.length) return content
  
  let hotReload = '/* hot reload */'
  let code = _makeInsertedCodeArray(imports)
  
  let newContent = [
    '/* vue-automato */',
    'const runtimeInstall = require(' + loaderUtils.stringifyRequest(this, '!' + instalatorPath) + ')(component)',
    ...code.imports,
    ...code.consts,
    ...code.codes,
    ...code.installs,
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
    return this.callback(null, content, sourceMap)
  
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
    return this.callback(null, content, sourceMap)

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