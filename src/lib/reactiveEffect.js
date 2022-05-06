import { getDep, getDepMap } from "./dep.js";
import { isObject, isArray, hasOwn, hasChanged, isIntegerKey } from "./util.js";

//
let currentEffect = null;
//
let shouldTrack = true;
//
const effectStack = [];

const observer = function (effect) {
  const xxx = new ReactiveEffect(effect);
  xxx.run();
};

class ReactiveEffect {
  constructor(effect) {
    this.effect = effect;
    this.deps = [];
  }
  run() {
    // 这里调用栈的判断是为了防止依赖循环
    if (!effectStack.includes(this)) {
      try {
        currentEffect = this;
        effectStack.push(currentEffect);
        currentEffect.effect();
        return currentEffect.effect;
      } finally {
        effectStack.pop();
        currentEffect = effectStack[effectStack.length - 1] || null;
      }
    }
  }
}

function track(target, property) {
  if (currentEffect) {
    const dep = getDep(target, property);
    // 收集副作用
    // console.log(target);
    trackEffects(dep, target);
  }
}

function trackEffects(dep, target) {
  let shouldTrack = true;
  // 这里考虑的情况是一次副作用函数运行中多次触发GET劫持，触发track 获取dep 但是不再重复收集
  shouldTrack = !dep.has(currentEffect);
  // 依赖收集
  if (shouldTrack) {
    // console.log(target, currentEffect);
    // 收集依赖
    dep.add(currentEffect);
    //
    currentEffect.deps.push(dep);
  }
}

function trigger(target, property, type) {
  // console.log("trigger", target, property, type);
  let deps = [];
  switch (type) {
    case "ADD":
      // 数组新增属性,强制触发length
      if (isArray(target) && isIntegerKey(property)) {
        deps.push(...getDep(target, "length"));
      } else {
        deps.push(...getDep(target, property));
      }
      break;
    case "SET":
      deps.push(...getDep(target, property));
      break;
    case "DEL":
      deps.push(...getDep(target, property));
      break;
    default:
      break;
  }
  deps.forEach((item) => item.run());
}

export { observer, track, trigger, currentEffect };
