class MVVM {
  constructor(options = {}) {
    this.$options = options
    let data = (this._data = this.$options.data)
    observe(data)
    //data object proxying
    for (let key in data) {
      Object.defineProperty(this, key, {
        configurable: true,
        get() {
          return this._data[key]
        },
        set(newVal) {
          this._data[key] = newVal
        }
      })
    }

    initComputed.call(this)

    complie(options.el, this)

    options.mounted.call(this)
  }
}

class Obeserve {
  constructor(data) {
    let dep = new Dep()

    for (let key in data) {
      let val = data[key]
      observe(val)

      Object.defineProperty(data, key, {
        configurable: true,
        get() {
          Dep.target && dep.addSub(Dep.target)
          return val
        },
        set(newVal) {
          if (val === newVal) {
            return
          }

          val = newVal
          observe(newVal)

          dep.notify()
        }
      })
    }
  }
}

function observe(data) {
  if (!data || typeof data !== 'object') {
    return
  }
  return new Obeserve(data)
}

function complie(el, vm) {
  vm.$el = document.querySelector(el)
  let fragment = document.createDocumentFragment()

  while ((child = vm.$el.firstChild)) {
    fragment.appendChild(child)
  }

  function replace(frag) {
    Array.from(frag.childNodes).forEach(node => {
      let txt = node.textContent
      let reg = /\{\{(.+?)\}\}/g

      if (node.nodeType === 1) {
        let nodeAttr = node.attributes

        Array.from(nodeAttr).forEach(attr => {
          let name = attr.name
          let exp = attr.value

          if (!name.includes('v-model')) {
            return
          }

          node.value = get(vm, exp)

          new Watcher(vm, exp, newVal => {
            node.value = newVal
          })

          node.addEventListener('input', e => {
            let newVal = e.target.value
            assign(vm, exp, newVal)
          })
        })
      }

      if (node.nodeType === 3 && reg.test(txt)) {
        let exp = RegExp.$1
        let val = get(vm, exp)

        node.textContent = txt.replace(reg, val).trim()

        new Watcher(vm, exp, newVal => {
          node.textContent = txt.replace(reg, newVal).trim()
        })
      }

      if (node.childNodes && node.childNodes.length) {
        replace(node)
      }
    })
  }

  replace(fragment)

  vm.$el.appendChild(fragment)
}

class Dep {
  constructor() {
    this.subs = []
  }
  addSub(sub) {
    this.subs.push(sub)
  }
  notify() {
    this.subs.forEach(sub => sub.update())
  }
}

class Watcher {
  constructor(vm, exp, fn) {
    this.fn = fn
    this.vm = vm
    this.exp = exp

    Dep.target = this
    let val = get(vm, exp) //just to call get method so Dep.target will be added to sub list
    Dep.target = null
  }

  update() {
    let val = get(this.vm, this.exp)
    this.fn(val)
  }
}

function initComputed() {
  let vm = this
  let computed = this.$options.computed

  Object.keys(computed).forEach(key => {
    Object.defineProperty(vm, key, {
      get:
        typeof computed[key] === 'function' ? computed[key] : computed[key].get,
      set() {}
    })
  })
}

function get(obj, prop) {
  if (typeof prop === 'string') arr = prop.split('.')

  arr.forEach(key => {
    obj = obj[key]
  })

  return obj
}

function assign(obj, prop, value) {
  if (typeof prop === 'string') arr = prop.split('.')

  if (prop.length > 1) {
    let e = arr.shift()
    assign(
      (obj[e] =
        Object.prototype.toString.call(obj[e]) === '[object Object]'
          ? obj[e]
          : {}),
      arr,
      value
    )
  } else obj[arr[0]] = value
}
