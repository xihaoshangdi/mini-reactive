import { track, trigger, resetTracking, pauseTracking } from "./reactiveEffect.js";
import { reactive, ref, ReactiveEnum, rawToProxyMap, toRaw } from "./reactive.js";
import {
  isObject,
  isArray,
  hasOwn,
  hasChanged,
  isIntegerKey,
  isSymbol,
} from "./util.js";
export const ITERATE_KEY = Symbol("iterate");
export const HAS_KEY = Symbol("has");
// well-known symbol 不应被观察的数据
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map((key) => Symbol[key])
    .filter(isSymbol)
);
// 数组方法相关
const arrayInstrumentations = createArrayInstrumentations()
// 这个arrayInstrumentations是为了处理 数组方法收集导致的可能的自循环 
// 解决思路：重写数组方法，数组原生方法调用前，暂停依赖收集，原生方法调用后，开启依赖收集
// 原生方法陷阱Setter导致副作用除触发时，需要开启依赖收集，副作用执行完成后，重新恢复收集状态
function createArrayInstrumentations() {
  const instrumentations = {}
  ;(['push', 'pop', 'shift', 'unshift', 'splice']).forEach(property => {
    instrumentations[property] = function () {
      pauseTracking()
      const result = toRaw(this)[property].apply(this, arguments)
      resetTracking()
      return result
    }
  })
  return instrumentations
}

const baseHandler = {
  get: function (target, property, receiver) {
    console.log("get trigger", target, property);
    // 处理toRaw 获取原始对象
    if (
      property === ReactiveEnum.RAW &&
      receiver === rawToProxyMap.get(target)
    ) {
      return target;
    }
    // 处理数组相关
    const targetIsArray = isArray(target)
    if (targetIsArray && hasOwn(arrayInstrumentations, property)) {
      return Reflect.get(arrayInstrumentations, property, receiver)
    }
    // 执行静态get方法
    const result = Reflect.get(target, property, receiver);
    // 处理 well-known symbol
    if (isSymbol(property) && builtInSymbols.has(property)) {
      return result;
    }
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
  ownKeys: function (target) {
    const result = Reflect.ownKeys(target);
    // console.log("ownKeys trigger", target);
    // 依赖收集 这里声明一种新的类型用于依赖收集迭代器相关的副作用
    track(target, isArray(target) ? "length" : ITERATE_KEY, "ITERATE");
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
    console.log("set trigger", target, property, oldValue, value, receiver);
    // 这里的比较是为了只触发目标对象身上的属性变动相关的副作用,目标对象原型链上的属性变动不触发
    if (target === toRaw(receiver)) {
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
        // 已有属性判断值是否变化 解决副作用互相赋值导致的循环问题
        trigger(target, property, "SET");
      }
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
