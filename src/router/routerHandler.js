import { isTurnChild } from '../utils/isTurnChild';
import { lifecycle } from '../lifecycle';

export const turnApp = async () => {
  // 查看当前路由是否有变化
  if(isTurnChild()) {
    // 路由变化，修改子应用
    await lifecycle();
  }
}