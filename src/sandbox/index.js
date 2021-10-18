import { findAppByName } from '../utils/queryApp';
import { ProxySandBox } from './proxySandbox';
import {performScriptForEval} from './performScript';

export const lackOfLifecycle = (lifecycles) => (
  !lifecycles ||
  !lifecycles.bootstrap ||
  !lifecycles.mount ||
  !lifecycles.unmount
)

export const sandbox = (script, appName) => {
  // 获取当前子应用
  const app = findAppByName(appName);

  // 创建沙箱环境
  const global = new ProxySandBox();

  // 设置微前端环境
  window.__MICRO_WEB__ = true;

  // 获取子应用生命周期
  const lifecycles = performScriptForEval(script, appName, global.proxy);

  app.sandBox = global;

  // 检查子应用是否包含必须的方法
  const isLack = lackOfLifecycle(lifecycles)
  if (isLack) return;

  app.bootstrap = lifecycles.bootstrap;
  app.mount = lifecycles.mount;
  app.unmount = lifecycles.unmount;
}