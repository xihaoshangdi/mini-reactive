import { baseHandler } from "./baseHandler";

const rawToProxyMap = new WeakMap();

const reactive = function (raw) {
  let proxy = rawToProxyMap.get(raw) || null;

  if (proxy) {
    return proxy;
  }

  proxy = new Proxy(raw, baseHandler);

  rawToProxyMap.set(raw, proxy);

  return proxy;
};

const ref = function (raw) {
  return new Proxy({ value: raw }, baseHandler);
};

export { reactive, ref };
