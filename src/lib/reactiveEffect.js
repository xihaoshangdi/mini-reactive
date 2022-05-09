import { getDep, getDepMap } from "./dep.js";
import { ITERATE_KEY } from "./baseHandler";
import { isObject, isArray, hasOwn, hasChanged, isIntegerKey } from "./util.js";

//
let currentEffect = null;
//
let shouldTrack = true;
//
const effectStack = [];

const observer = function (effect) {
  const _effect = new ReactiveEffect(effect);
  _effect.run();
  // 这里是为了返回原函数
  const runner = _effect.run.bind(_effect);
  return runner;
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
        // 收集前清空所有依赖：为了防止未激活的分支的依赖仍遗留在收集中
        cleanupEffects(currentEffect);
        // 执行方法收集依赖
        currentEffect.effect();
        return currentEffect.effect;
      } finally {
        effectStack.pop();
        currentEffect = effectStack[effectStack.length - 1] || null;
      }
    }
  }
}

function track(target, property, type) {
  if (currentEffect) {
    const dep = getDep(target, property);
    // 收集副作用
    // console.log(target);
    trackEffects(dep, target, type);
  }
}

function trackEffects(dep, target) {
  let shouldTrack = true;
  // 这里考虑的情况是一次副作用函数运行中多次触发GET劫持，触发track 获取dep 但是不再重复收集
  // 避免了隐式自增的情况重复收集
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
  // 这里不用getDep的原因是 getDep会加入空Set
  const effectMap = getDepMap(target);

  switch (type) {
    case "ADD":
      // ADD 触发的情况：
      // 1.对象新增的属性已经存在副作用(触发对应的副作用)
      // 2.数组的越界新增(触发length副作用 )
      // 3.对象的属性新增(触发ITERATE_KEY副作用 )
      deps.push(effectMap.get(property));
      if (isArray(target) && isIntegerKey(property)) {
        deps.push(effectMap.get("length"));
      } else {
        deps.push(effectMap.get(ITERATE_KEY));
      }
      break;
    case "SET":
      deps.push(effectMap.get(property));
      break;
    case "DEL":
      deps.push(effectMap.get(property));
      break;
    default:
      break;
  }
  // 收集所有的副作用函数并过滤可能的 undefined 情况 
  // deps [ undefined,Set(1),Set(2) ]
  triggerEffects(deps.filter((dep) => dep));
}

function triggerEffects(deps) {
  // 这里会合并重复的副作用函数
  const effects = new Set(...deps);
  effects.forEach((item) => item.run());
}

function cleanupEffects(effect) {
  const deps = effect.deps;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
}

export { observer, track, trigger, currentEffect };
