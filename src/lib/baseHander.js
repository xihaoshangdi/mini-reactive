import { track, trigger } from "./reactiveEffect.js";
import { reactive, ref } from "./reactive.js";
import { isObject } from "./util.js";
const baseHandler = {
  get: function (target, property, receiver) {
    const result = Reflect.get(target, property, receiver);
    // console.log("get trigger", target, property);
    // 依赖收集
    track(target, property);
    // 代理嵌套子节点
    if (isObject(result)) {
      return reactive(result);
    }
    return result;
  },
  has: function (target, property) {
    const result = Reflect.has(target, property);
    // console.log("has trigger", target, property);
    // 依赖收集
    track(target, property);
    return result;
  },
  set: function (target, property, value, receiver) {
    const result = Reflect.set(target, property, value, receiver);
    // console.log("set trigger", target, property, value);
    // 依赖触发
    trigger(target, property);
    return result;
  },
  deleteProperty: function (target, property) {
    const result = Reflect.deleteProperty(target, property);
    // console.log("delete trigger", target, property);
    // 依赖触发
    trigger(target, property);
    return result;
  },
};

export { baseHandler };
