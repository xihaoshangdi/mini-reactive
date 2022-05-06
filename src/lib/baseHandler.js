import { track, trigger } from "./reactiveEffect.js";
import { reactive, ref } from "./reactive.js";
import { isObject, isArray, hasOwn, hasChanged, isIntegerKey } from "./util.js";
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
    const oldValue = target[property];
    // hasProp 判断是新增属性还是已有属性
    const hasProp =
      isArray(target) && isIntegerKey(property)
        ? Number(property) < target.length
        : hasOwn(target, property);
    const result = Reflect.set(target, property, value, receiver);
    //console.log("set trigger", target, property, oldValue, value, receiver);
    // 数组相关(依赖触发):
    // 1.数组越界赋值: 无法区分是新增属性，还是已有属性赋值,不会触发length属性变动
    // 2.数组方法赋值(push):触发length的属性变动，但是length的旧值新值一致
    // 3.数组方法移除(splice):触发length的属性变动，但是length的旧值新值不一定一致
    // 解决思路:
    // 1.区分原始对象和数组，判断当前变动的属性是新增属性还是已有属性
    // 2.根据变动的属性是否一致判断是否触发副作用
    if (!hasProp) {
      trigger(target, property, "ADD");
    } else if (hasChanged(value, oldValue)) {
      // 已有属性判断值是否变化
      trigger(target, property, "SET");
    }
    return result;
  },
  deleteProperty: function (target, property) {
    const result = Reflect.deleteProperty(target, property);
    // console.log("delete trigger", target, property);
    // 依赖触发
    trigger(target, property, "DEL");
    return result;
  },
};

export { baseHandler };
