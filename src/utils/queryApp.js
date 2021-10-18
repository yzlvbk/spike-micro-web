import { getSubApps } from '../const/subApps';

export const filterApp = (key, rule) => {
  return getSubApps().find(app => app[key] === rule);
}

// 获取当前子应用
export const findCurrentApp = () => {
  const currentRouter = window.location.pathname.match(/(\/\w+)/);
  if(currentRouter){
    return filterApp('activeRule', currentRouter[0]);
  }
  return {};
}

// 根据 路由 查找子应用
export const findAppByRoute = (router) => {
  return filterApp('activeRule', router);
};

// 根据 name 查找子应用
export const findAppByName = (name) => {
  return filterApp('name', name);
};