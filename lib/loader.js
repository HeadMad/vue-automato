const path = require('path')
const loaderUtils = require('loader-utils')
const compiler = require('vue-template-compiler')

const { requirePeer } = require('../util')
const installComponentsPath = require.resolve('./installComponents.js')

function getMatches (nodes, matches) {
  const imports = []

  nodes.forEach(node => {
    for (let matcher of matches) {

      let rootPath = this.rootContext
      let parentPath = this.resourcePath.substring(this.rootContext.length + 1)

      let match = matcher(node, {rootPath, parentPath})
      if (!match) continue

      imports.push(match)
    }
    
  });

  // remove duplicates from one component
  let sortedImports = imports.filter(function (imp) {
    let name = imp.comp
    if (this.indexOf(name) !== -1) return false
    this.push(name)
    return true
  }, [])

  return sortedImports
}

function install (content, imports) {

  if (!imports.length) return content
  
  let newContent = '/* vue-automato */\n'
  newContent += `import installComponents from ${loaderUtils.stringifyRequest(this, '!' + installComponentsPath)}\n`
  newContent += imports.map(imps => `import ${imps.comp} from "${imps.from}"`).join('\n') + '\n'
  newContent += `installComponents(component, {${imports.map(imps => imps.comp).join(',')}})`
  newContent += `\n\n/* hot reload */`
  
  // Insert our modification before the HMR code
  if (content.indexOf('/* hot reload */') !== -1) {
    content = content.replace('/* hot reload */', newContent)
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


  if (!this.resourceQuery) {
    const readFile = path => new Promise((resolve, reject) => {
      this.fs.readFile(path, function (err, data) {
        if (err) reject(err)
        else resolve(data)
      })
    })

    this.addDependency(this.resourcePath)

    const nodes = []
    const file = (await readFile(this.resourcePath)).toString('utf8')
    const component = compiler.parseComponent(file)
    if (component.template) {
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

      compiler.compile(component.template.content, {
        modules: [{
          postTransformNode: node => {
            nodes.push(node)
          }
        }]
      })
    }

    content = install(content, getMatches.call(this, nodes, options.match))
  }

  this.callback(null, content, sourceMap)
}