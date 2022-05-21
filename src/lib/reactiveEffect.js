import { getDep, getDepMap } from "./dep.js";
import { ITERATE_KEY } from "./baseHandler";
import { extend, isArray, hasOwn, hasChanged, isIntegerKey } from "./util.js";

let shouldTrack = true
//
let currentEffect = null;
//

//
const effectStack = [];

const observer = function (effect, options) {
  const _effect = new ReactiveEffect(effect);
  // 合并可选项
  extend(_effect, options);
  // lazy的情况不立即调度
  if (!options || !options.lazy) {
    _effect.run();
  }
  // 这里是为了返回原函数
  const runner = _effect.run.bind(_effect);
  // 这里挂载 _effect 主要是为了后面Stop的时候用于停止
  runner.effect = _effect;
  return runner;
};

const stop = function (runner) {
  runner.effect.stop();
};

class ReactiveEffect {
  constructor(effect) {
    this.active = true;
    this.deferStop = false;
    this.effect = effect;
    this.deps = [];
  }
  run() {
    // 被Stop停止的副作用直接返回原函数
    if (!this.active) {
      return this.effect();
    }
    // 这里记录副作用的收集状态，主要是为了让被Setter触发的依赖能正常被收集且不影响整个流程
    const lastShouldTrack = shouldTrack
    // 这里调用栈的判断是为了防止依赖循环
    if (!effectStack.includes(this)) {
      try {
        shouldTrack = true
        currentEffect = this;
        effectStack.push(currentEffect);
        // 收集前清空所有依赖：为了防止未激活的分支的依赖仍遗留在收集中
        cleanupEffects(currentEffect);
        // 执行方法收集依赖
        return currentEffect.effect();
      } finally {
        effectStack.pop();
        currentEffect = effectStack[effectStack.length - 1] || null;
        shouldTrack = lastShouldTrack
        if (this.deferStop) {
          this.stop();
        }
      }
    }
  }

  stop() {
    // 当前在执行的副作用要Stop 自身，需要延后进行Stop
    if (currentEffect === this) {
      this.deferStop = true;
    } else {
      // 清除当前副作用所有的收集
      cleanupEffects(this);
      // 关闭副作用的激活状态
      this.active = false;
    }
  }
}

function track(target, property, type) {
  if (shouldTrack && currentEffect) {
    const dep = getDep(target, property);
    // 收集副作用
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
    // 收集依赖
    dep.add(currentEffect);
    //
    currentEffect.deps.push(dep);
  }
  // console.log('depsMap', getDepMap(target));
}

function trigger(target, property, type) {
  // console.log("trigger", target, property, type);
  let deps = [];
  // 这里不用getDep的原因是 getDep会加入空Set
  const effectMap = getDepMap(target);
  // 这里是为了处理数组直接修改length的情况,需要触发影响到的副作用
  if (isArray(target)) {
    effectMap.forEach((dep, key) => {
      if (key === "length" || key >= target[property]) {
        deps.push(dep);
      }
    });
  }
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
  const effects = [];
  deps.filter((dep) => dep).forEach((dep) => effects.push(...dep));
  triggerEffects(effects);
}

function triggerEffects(effects) {
  // 这里会合并重复的副作用函数 仅留下需要执行的副作用
  const effective = new Set(effects);
  effective.forEach((effect) => {
    // 这里比较是为了消除 自循环的情况
    if (currentEffect !== effect) {
      // console.log('需要执行的依赖', effect);
      if (effect.scheduler) {
        effect.scheduler();
      } else {
        effect.run();
      }
    }
  });
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

// Test use
const effect = observer;

function pauseTracking() {
  shouldTrack = false
}

function resetTracking() {
  shouldTrack = true
}

export { effect, observer, stop, track, trigger, currentEffect,pauseTracking,resetTracking };
