import { rewriteRouter } from './router/rewriteRouter';
import { getSubApps, setSubApps} from './const/subApps';
import { setMainLifecycle } from './const/mainLifecycles';
import { findCurrentApp } from './utils/queryApp';
import { prefetch } from './htmlLoader/prefetch';
import { Custom} from './customEvent';

const custom = new Custom;
window.custom = custom;

// 重写路由跳转事件，增加拦截功能，字应用跳转都依赖此方法。
rewriteRouter();

export const registerMicroApps = (subApps, mainLifecycle) => {
  // 注册子应用
  setSubApps(subApps);

  // 注册主应用生命周期
  setMainLifecycle(mainLifecycle);
}

export const start = async () => {
  // 获取子应用列表
  const subApps = getSubApps()

  if(!subApps.length) {
    throw new Error('子应用列表为空，请查看是否正确注册');
  }else {
    const app = findCurrentApp();

    if(app) {
      const { pathname, hash } = window.location
      const url = pathname + hash
      window.history.pushState(url, app.name, url|| app.activeRule)
    }

    // 将当前子应用做标记
    window.__CURRENT_HISTORY_PREFIX__ = app.activeRule;

    // 预加载 
    await prefetch();
  }
}