/**
 * 劫持event,触发自定义事件
 * @param {*} event 
 * @param {*} ListenerName 
 * @returns 
 */
export const patchRouter = (event, ListenerName) => {
  return function() {
    // 创建一个自定义事件
    const e = new Event(ListenerName);
    // 执行event事件, this -> window.history
    event.apply(this, arguments);
    // 通过dispatchEvent来触发自定义事件
    window.dispatchEvent(e);
  }
}