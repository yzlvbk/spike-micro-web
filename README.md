# 从零到一实现微前端框架

## 前言

> 公司的项目是使用微前端架构，为了彻底搞懂微前端原理，笔者尝试自己写一个微前端框架。

微前端是目前比较火的一种技术架构，它的好处和应用场景，很多优秀的文章已经讲述了，这个笔者就不过多地介绍。

## 微前端框架执行流程图

我们平时写代码，所有的逻辑都在脑子，是比较混乱，如果将这个逻辑绘制成流程图，会大大的得到简化。

开发一个框架时，设计到很多的功能，并且相互关联。我们可以先将这些功能点，使用流程图的方式串联起来，再实现具体的功能，最后再根据逻辑关联起来。

下面我们先来看看，有哪些功能点。

##### 功能点：

- 路由劫持
- 应用生命周期
- 子应用加载器
- 沙箱的设计
- 通信的设计

然后我们理清这些功能点的逻辑，再将它们关联起来。就绘制成了一张流程图。

有了这个流程图，我们就知道代码的执行逻辑。这样就大大降低了开发难度。

![微前端框架执行流程](/Users/a/Desktop/微前端框架执行流程.png)

## 实现路由劫持

我们需要监听到路由的变化，才可以切换子应用。

对于`SPA`（单页面应用）架构的项目，使用的路由分为两种：

1. `history`模式
2. `hash`模式

对于这两种路由可以分别使用下面的方式监听：

1. `popstate`
2. `hashchange`

除此之外，`pushState`，`replaceState`，也会造成路由的变化，因此我们需要重写这两个函数。接下来看代码：

```js
const rewriteRouter = () => {
  window.history.pushState = patchRouter(window.history.pushState, 'micro_push');
  window.history.replaceState = patchRouter(window.history.replaceState, 'micro_replace');
  // 添加路由跳转事件监听
  window.addEventListener('micro_push', turnApp);
  window.addEventListener('micro_replace', turnApp);
}

/**
 * 劫持event,触发自定义事件
 * @param {*} event 
 * @param {*} ListenerName 
 * @returns 
 */
export const patchRouter = (event, ListenerName) => {
  return function() {
    // 创建一个自定义事件
    const e = new Event(ListenerName);
    // 执行event事件, this -> window.history
    event.apply(this, arguments);
    // 通过dispatchEvent来触发自定义事件
    window.dispatchEvent(e);
  }
}
```

上面的代码做的事情很简单，就是在执行`pushState`和`replaceState`方法时，触发我们的自定义事件，这样我们就能监听到`pushState`和`replaceState`所导致的路由的变化。

## 应用生命周期

在实现了路由劫持后，我们需要考虑子应用加载的过程。在这个过程中，需要考虑到可以让使用者在不同的时期，执行自己的逻辑。这就需要我们暴露相应的生命周期。

如果想增加一些生命周期也是可以的，这边笔者开始定义生命周期。

对于主应用来说，我们定为三个生命周期：

1. `beforeLoad`：挂载子应用前
2. `mounted`：挂载子应用后
3. `destoryed`：卸载子应用后

对于子应用来说，我们也定为三个生命周期：

1. `bootstrap`：加载子应用
2. `mount`：渲染子应用
3. `unmount`：卸载子应用

下面我们来看下，执行生命周期时的顺序。

```js
export const lifecycle = async () => {
  const prevApp = findAppByRoute(window.__ORIGIN_APP__);
  const nextApp = findAppByRoute(window.__CURRENT_HISTORY_PREFIX__);
  if(prevApp) {
    // 销毁代理沙箱
    prevApp.sandBox && prevApp.sandBox.inactive();
    await unmount(prevApp);
  }
  if(!nextApp) {
    return;
  }
  await bootstrap(nextApp);
  await mount(nextApp);
}

// 装载应用
export const bootstrap = async (app) => {
  await runMainLifecycle('beforeLoad', app);
  // 获取子应用的dom结构
  await htmlLoader(app);
  app && await app.bootstrap();
}

// 渲染应用
export const mount = async (app) => {
  app && await app.mount(app);
  await runMainLifecycle('mounted', app)
}

// 卸载应用
export const unmount = async (app) => {
  app && app.unmount && await app.unmount(app);
  await runMainLifecycle('destoryed', app)
}

// 执行主应用生命周期
export const runMainLifecycle = async (type, app) => {
  const mainLifecycle = getMainLifecycle();
  // 因为主应用里配置的生命周期是一个数组，所以需要执行数组中的所有内容
  await Promise.all(mainLifecycle[type].map(async item => await item(app)));
}
```

上面的代码中，有一些部分还没有介绍到。可以先忽略，下面会详细介绍。

这里主要做的事情就是，安照上面定义的生命周期的顺序，执行相应的函数。

## 子应用加载器

这里就到了微前端的核心部分，加载子应用。

我们先梳理好思路：

1. 获取到子应用`HTML`的内容
2. 读取`HTML`中`script`和`link`标签的资源
3. 将`HTML`中的`dom`，插入到`container`容器中
4. 执行`script`和`link`标签的资源

下面我们来看代码：

```js
import { fetchUrl } from '../utils/fetchResources';
import {sandbox} from '../sandbox';
// 设置缓存
const cache = {};

// 解析 js 内容
export const getResources = (dom, app) => {
  const scriptUrls = [];
  const scripts = [];

  function deepParse(element) {
    const children = element.children;
    const parent = element.parentNode;

    // 处理script标签中的js文件
    if(element.nodeName.toLowerCase() === 'script') {
      const src = element.getAttribute('src');
      if(!src) {
        // 在script标签中写的内容
        let script = element.innerHTML;
        scripts.push(script);
      }else {
        if(src.startsWith('http')) {
          scriptUrls.push(src);
        }else {
          scriptUrls.push(`http:${app.entry}${src}`);
        }
      }

      if (parent) {
        let comment = document.createComment('此 js 文件已被spike-micro-web替换');
        // 在 dom 结构中删除此文件引用
        parent.replaceChild(comment, element);
      }
    }

    // 处理link标签中的js文件
    if(element.nodeName.toLowerCase() === 'link') {
      const href = element.getAttribute('href');
      if(href.endsWith('.js')) {
        if (href.startsWith('http')) {
          scriptUrls.push(href);
        } else {
          // fetch 时 添加 publicPath
          scriptUrls.push(`http:${app.entry}${href}`);
        }
      }
    }

    for (let i = children.length - 1; i > 0; i--) {
      deepParse(children[i]);
    }
  }

  deepParse(dom);

  return [scriptUrls, scripts, dom.outerHTML]
}

// 解析html
export const parseHtml = async(app) => {
  if(cache[app.name]) return cache[app.name];

  const div = document.createElement('div');
  let scriptsArray = [];

  div.innerHTML = await fetchUrl(app.entry);

  const [scriptUrls, scripts, elements] = getResources(div, app);

  const fetchedScript = await Promise.all(scriptUrls.map(url => fetchUrl(url)));


  scriptsArray = scripts.concat(fetchedScript);

  cache[app.name] = [elements, scriptsArray];

  return [elements, scriptsArray];
}

// 加载和渲染html
export const htmlLoader = async (app) => {
  const [dom, scriptsArray] = await parseHtml(app);

  const container = document.querySelector(app.container);
  if(!container) {
    throw new Error(`${app.container} 的容器不存在，请查看是否正确指定！`);
  }

  container.innerHTML = dom;

  scriptsArray.map((item) => {
    sandbox(item, app.name);
  });
}
```

## 沙箱的设计

微前端架构有多个子应用，为了保证不相互影响，因此需要进行数据隔离。通常有两种沙箱的方案：

1. 快照沙箱
2. Proxy代理沙箱

##### 快照沙箱

首先来看快照沙箱的原理。在挂载子应用前，记录当前window上的内容。尽管子应用在window上做修改。然后在销毁子应用前，将window还原成记录的内容。

下面我们来看代码：

```js
// 快照沙箱
export class SnapShotSandBox {
  constructor() {
    this.proxy = window;
    this.active();
  }
  active() {
    this.snapshot = new Map(); // 创建 window 对象的快照
    for (const key in window) {
      if (window.hasOwnProperty(key)) {
        // 将window上的属性进行拍照
        this.snapshot[key] = window[key];
      }
    }
  }
  inactive() {
    for (const key in window) {
      if (window.hasOwnProperty(key)) {
        // 将上次快照的结果和本次window属性做对比
        if (window[key] !== this.snapshot[key]) {
          // 还原window
          window[key] = this.snapshot[key];
        }
      }
    }
  }
}
```

##### Proxy代理沙箱

代理沙箱，我们采用Proxy特性，对window对象做代理。将代理对象设为子应用的window对象。如果子应用新增key，则放在一个空对象上。在销毁子应用时，情况对象上的属性。

下面我们来看代码：

```js
let defaultValue = {}


export class ProxySandBox {
  constructor() {
    this.active()
  }

  active() {
    this.proxy = new Proxy(window, {
      set(target, name, value) {
        defaultValue[name] = value;
        return true;
      },

      get(target, name) {
        if( typeof target[ name ] === 'function' && /^[a-z]/.test( name ) ){
          return target[ name ].bind && target[ name ].bind( target );
        }else{
          return defaultValue[name] || target[ name ];
        }
      }
    });
  }

  inactive() {
    defaultValue = {}
  }
}
```

## 通信的设计

我们考虑到开发业务时，不可避免的需要应用间的通信。父子通信，子父通信，子应用间通信。

我们设计了3种通信方式：

- props传递
- 全局store
- CustomEvent自定义事件

##### props传递

在注册子应用时，可以将数据放进去。子应用在`mount`和`unmount`阶段会接收到注册app的值。

##### 全局store

我们需要调用createStore创建一个store，会返回`getStore`，`updateStore`，`subscribe`三个方法。

`getStore`可以回去全局`store`。需要通信的地方先`subscribe`订阅一下。当`updateStore`时，会执行所有订阅函数。

下面我们来看代码：

```js
export const createStore = (initData = {}) => {
  let store = initData;
  let observers = [];
  const getStore = () => store;

  const updateStore = (newValue) => new Promise((resolve) => {
    if(newValue !== store) {
      let oldValue = store;
      store = newValue;
      resolve(store);
      observers.forEach(fn => fn(newValue, oldValue));
    }
  })

  const subscribe = (fn) => observers.push(fn);

  return {
    getStore,
    updateStore,
    subscribe
  }
}
```

##### CustomEvent自定义事件

顾名思义，这里使用了`CustomEvent`。我们需要先监听一个事件，然后在需要通信的时候通过`CustomEvent`触发这个事件。

下面我们来看代码：

```js
export class Custom {
  on (eventName, cb) {
    window.addEventListener(eventName, function(e) {
      cb(e.detail)
    });
  }

  emit(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data
    })
    window.dispatchEvent(event);
  }
}
```

## 总结

通过自己实现一个微前端框架，尽管是简陋的版本。我们也深入理解了其中原理，了解为何这样实现。当我们使用其他微前端框架时，也能很快上手，清楚具备哪些能力。

