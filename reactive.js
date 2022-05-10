(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  const targetMap = new WeakMap();

  const getDep = function (target, property) {
    if (!targetMap.has(target)) {
      targetMap.set(target, new Map());
    }
    const depsMap = targetMap.get(target);
    if (!depsMap.has(property)) {
      depsMap.set(property, createDep());
    }
    return depsMap.get(property);
  };

  const getDepMap = function (target) {
    if (!targetMap.has(target)) {
      targetMap.set(target, new Map());
    }
    return targetMap.get(target);
  };


  const createDep = () => {
    return new Set();
  };

  const isObject = (val) => {
    return val !== null && typeof val === "object";
  };
  const isString = (val) => typeof val === "string";
  const isArray = Array.isArray;
  const isSymbol = (val) => typeof val === "symbol";

  const isIntegerKey = (key) =>
    isString(key) &&
    key !== "NaN" &&
    key[0] !== "-" &&
    "" + parseInt(key, 10) === key;

  const hasOwn = (val, key) => hasOwnProperty.call(val, key);

  const hasChanged = (value, oldValue) => !Object.is(value, oldValue);

  const extend = Object.assign;

  //
  let currentEffect = null;
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
    // 这里挂载原函数主要是为了后面Stop的时候用于停止
    runner._effect = _effect;
    return runner;
  };

  class ReactiveEffect {
    constructor(effect) {
      this.deferStop = false;
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
          return currentEffect.effect();
        } finally {
          effectStack.pop();
          currentEffect = effectStack[effectStack.length - 1] || null;
        }
      }
    }

    stop() {
      // todo
    }
  }

  function track(target, property, type) {
    if (currentEffect) {
      const dep = getDep(target, property);
      // 收集副作用
      // console.log(target);
      trackEffects(dep);
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
      if (effect.scheduler) {
        effect.scheduler();
      } else {
        effect.run();
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

  const ITERATE_KEY = Symbol("iterate");
  // well-known symbol 不应被观察的数据
  const builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
      .map((key) => Symbol[key])
      .filter(isSymbol)
  );

  const baseHandler = {
    get: function (target, property, receiver) {
      const result = Reflect.get(target, property, receiver);
      // console.log("get trigger", target, property);
      // 处理toRaw 获取原始对象
      if (
        property === ReactiveEnum.RAW &&
        receiver === rawToProxyMap.get(target)
      ) {
        return target;
      }
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
      track(target, isArray(target) ? "length" : ITERATE_KEY);
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

  const ReactiveEnum = {
    RAW: "_raw",
  };
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

  const toRaw = function (proxy) {
    // get拦截器根据 ReactiveEnum.RAW 这个指定属性 返回原生对象
    const raw = proxy && proxy[ReactiveEnum.RAW];
    return raw ? toRaw(raw) : proxy;
  };

  const obj = reactive({});
  observer(() => {
  });

  obj.prop = 16;

})));
