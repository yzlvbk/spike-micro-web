export const createStore = (initData = {}) => {
  let store = initData;
  let observers = [];
  const getStore = () => store;

  const updateStore = (newValue) => new Promise((resolve) => {
    if(newValue !== store) {
      let oldValue = store;
      store = newValue;
      resolve(store);
      observers.forEach(fn => fn(newValue, oldValue));
    }
  })

  const subscribe = (fn) => observers.push(fn);

  return {
    getStore,
    updateStore,
    subscribe
  }
}