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