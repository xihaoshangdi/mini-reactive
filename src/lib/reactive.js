import { baseHandler } from "./baseHandler";

export const ReactiveEnum = {
  RAW: "_raw",
};
export const rawToProxyMap = new WeakMap();

const reactive = function (raw) {
  let proxy = rawToProxyMap.get(raw) || null;

  if (proxy) {
    return proxy;
  }

  proxy = new Proxy(raw, baseHandler);

  rawToProxyMap.set(raw, proxy);

  return proxy;
};

const toRaw = function (proxy) {
  // get拦截器根据 ReactiveEnum.RAW 这个指定属性 返回原生对象
  const raw = proxy && proxy[ReactiveEnum.RAW];
  return raw ? toRaw(raw) : proxy;
};

const ref = function (raw) {
  return new Proxy({ value: raw }, baseHandler);
};

export { reactive, ref, toRaw };
