# vue-automato

The `vue-automato` is a tool for creating plug-ins for automatic local registration of components and directives and more...

## Installation

`npm install vue-automato --save-dev`
<br>`npm install headmad/vue-automato --save-dev`

---

You can use it directly from the vue-project configuration file.
<br> _This example will automatically search for components whose tag starts on the "app-" and load them locally_

```javascript
// vue.config.js

const VueAutomato = require('vue-automato')

const autoloaderPlugin = new VueAutomato({
  match(tag, params, node, link) {
    let prefix = 'app-'

    if (!tag.kebabTag.startsWith(prefix)) return false

    let result = {}
    
    result.name = tag.camelTag
    result.src = `@/components/${tag.kebabTag}.vue`

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

The argument takes an `Object` with one method - `match`, which in turn has arguments: 
- **tag**
<br> `Object`. Contains next fields
  - **tag.rawTag**
  <br> `String`. Original tag (_for example: app-header-title_)
  - **tag.kebabTag**
  <br> `String`. Tag in kebab-case style (_app-header-title_)
  - **tag.camelTag**
  <br> `String`. came-case style (_AppHeaderTitle_)
- **params**
<br> `Object`. Additional parameter including:
  - **params.className**
  <br> `Array`. Classes specified in the class attribute
  - **params.directives**
  <br> `Array`. The attributes of the tag specified with prefix _"v-"_
  <br>`[{ name, value, isBinded }, ...]`
  - **params.props**
  <br> `Array`. The attributes of the tag, except for _directives_ and attributes _class_, _style_
  <br>`[{ name, arg, isDynamicArg, mods, value }, ...]`
- **node**
<br> `Object`. The node of this tag is from the virtual tree
  - **node.tag**
  <br> `String`. The name of the current tag
  - *coming soon...*
- **link**
<br> `Object`. Additional object that links all tags in a component
  - **params.rootPath**
  <br> `String`. Full path to the root directory of the project
  - **params.parentPath**
  <br> `String`. The path to the _.vue_ file relative to the root directory

## Returned value

The match method must return either `false` or an `Array` of `Objects` or an `Object` with fields:

- **install**
<br> `String`. Name of the property or method of the _Vue-object_ of the current component (_components, props, mixins..._)
<br> _*The value of the field will be replaced, so it is better to use the mixins property for merging_
- **name**
<br> `String`. The name of the constant to assign to the code or plug-in file
- **src**
<br> `String`. Link to the file assigned to the constant from the `name` property
<br>_*The file is to be used relative to the current component_
- **code**
<br> `String`. JS-code to be assigned to the constant from the `name` property
<br>_*The `code` property has a higher priority than `src` when both are specified_

---
## Example

If the match method returns the result:
```javascript
return [
  {
    install: "components",
    name: "MyComponent",
    src: "@/components/my-component.vue"
  },{
    install: "data",
    name: "myProps",
    code: 'function() {return { size: "xl" }}'
  }
]
```

Will compile
```javascript
// From this

export default {
  data() {
    return {
      some: "data"
    }
  }
}


// To this

import MyComponent from "@/components/my-component.vue"
export default {
  components: { MyComponent },
  data() {
    return {
     size: "xl"
    }
  }
}
```

