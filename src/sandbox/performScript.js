// 执行应用中的 js 内容  eval篇
export const performScriptForEval = (script, appName, global) => {
  // eval执行中的参数，需提前挂载到window上
  window.proxy = global
  const scriptText = `
    ((window) => {
      try {
        ${script}
      } catch (e) {
        console.error('run script error: ' + e)
      }
      return window['${appName}']
    })(window.proxy)
  `;

  return eval(scriptText);
}