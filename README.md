# vue-automato

The `vue-automato` is a tool for creating plug-ins for automatic local registration of components and directives.

You can use it directly from the vue-project configuration file.


```javascript
// vue.config.js

const VueAutomato = require('vue-automato')
const {camelize} = require('vue-automato/util')

const autoloaderPlugin = new VueAutomato({
  match(node, {rootPath, parentPath}) {
    let tag = node.tag
    if (!tag.startsWith('app-')) return false

    let result = {}
    let camelTag = camelize(tag)
    let name = tag.substring(4)
    
    result.comp = camelTag
    result.from = `@/components/${name}.vue`

    return result
  }
})

module.exports = {
  configureWebpack: {
    plugins: [ autoloaderPlugin ]
  }
}
```

## Parameters

- **match**
<br> Function. of processing each occurrence of the tag, taking three arguments:
  - **node**
  <br> Object. The node of this tag is from the virtual tree
    - **node.tag**
    <br> String. The name of the current tag
    - *coming soon*
    <br> 
  - **params**
  <br> Object. Additional parameter including:
    - **params.rootPath**
    <br> String. Full path to the root directory of the project
    - **params.parentPath**
    <br> String. The path to the parent vue file relative to the root directory of the project
