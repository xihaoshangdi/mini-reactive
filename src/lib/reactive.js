import {track, trigger } from "./reactiveEffect.js";

const handler = {
  get: function (target, property, receiver) {
    // console.log("get trigger", target, property);
    // 依赖收集
    track(target, property);
    return Reflect.get(target, property, receiver);
  },
  set: function (target, property, value, receiver) {
    const result = Reflect.set(target, property, value, receiver);
    // console.log("set trigger", target, property, value);
    // 依赖触发
    trigger(target, property);
    return result;
  },
};

const reactive = function (raw) {
  return new Proxy(raw, handler);
};

const ref = function (raw) {
  return new Proxy({ value: raw }, handler);
};

export { reactive, ref };
