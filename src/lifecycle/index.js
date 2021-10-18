import { findAppByRoute } from '../utils/queryApp';
import {getMainLifecycle} from '../const/mainLifecycles';
import { htmlLoader } from '../htmlLoader/htmlLoader';

/**
 * 触发子应用生命周期
 */
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