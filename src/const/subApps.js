// 子应用列表
let subApps = []

export const getSubApps = () => subApps;

export const setSubApps = (data) => {
  if (Array.isArray(data)) {
    subApps = data;
    return
  }

  subApps.push(data)
}
