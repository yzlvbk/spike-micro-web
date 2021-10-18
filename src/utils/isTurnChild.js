/**
 * 查看当前路由是否变化
 */
export const isTurnChild = () => {
  const { pathname, hash } = window.location;
  const pathnames = pathname.match(/(\/\w+)/g);

  /* 路由无变化 */
  if(
    pathnames &&
    pathnames[0] ===  window.__CURRENT_HISTORY_PREFIX__ &&
    hash === window.__CURRENT_HASH__
  ) {
    return false;
  }

  /* 路由变化 */

  // 记录上一个路由前缀
  window.__ORIGIN_APP__ =  window.__CURRENT_HISTORY_PREFIX__;

  if(!pathnames) return false;

  // 记录当前路由
  window.__CURRENT_HISTORY_PREFIX__ = pathnames[0];

  // 记录当前路由hash
  window.__CURRENT_HASH__ = hash;
  return true;
}