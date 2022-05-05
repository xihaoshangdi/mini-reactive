import { getDep } from "./dep.js";

// 
let currentEffect = null;
//
let shouldTrack = true;
// 
const effectStack=[]

const observer = function (effect) {
  const xxx = new ReactiveEffect(effect);
  xxx.run();
};

class ReactiveEffect {
  constructor(effect) {
    this.effect = effect;
    this.deps=[]
  }
  run(){
    // 这里调用栈的判断是为了防止依赖循环
    if (!effectStack.includes(this)) {
      try {
        currentEffect = this;
        effectStack.push(currentEffect)
        currentEffect.effect()
        return currentEffect.effect
      } finally {
        effectStack.pop()
        currentEffect = effectStack[effectStack.length - 1]||null
      }
    }
  }
}

function track(target, property){
  if(currentEffect){
    const dep = getDep(target, property);
    // 收集副作用
    // console.log(target);
    trackEffects(dep)  
  }
}

function trackEffects(dep){
  let shouldTrack = true;
  // 这里考虑的情况是一次副作用函数运行中多次触发GET劫持，触发track 获取dep 但是不再重复收集
  shouldTrack =!dep.has(currentEffect)
  // 依赖收集
  if(shouldTrack){
    // 收集依赖
    dep.add(currentEffect)
    // 
    currentEffect.deps.push(dep)
    console.log(dep);
  }
}

function trigger(target, property){
  const dep = getDep(target, property);
  // console.log('dep',dep);
  dep.forEach((item) => item.run());
}

export { observer,track,trigger,currentEffect };
