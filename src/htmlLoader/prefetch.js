import { getSubApps } from '../const/subApps';
import { parseHtml } from './htmlLoader';
export const prefetch = async () => {
  // 获取其余子应用
  const appPieces = getSubApps().filter(app => !window.location.pathname.startsWith(app.activeRule));

  // 加载所有子应用
  await Promise.all(appPieces.map(async app => await parseHtml(app)));
}