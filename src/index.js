import { reactive, ref, toRaw } from "./lib/reactive.js";
import { observer, stop } from "./lib/reactiveEffect.js";

let dummy;
const obj = reactive({ prop: 1 });
const queue = [];
const runner = observer(
  () => {
    dummy = obj.prop;
  },
  {
    scheduler: (e) => queue.push(e),
  }
);
debugger
obj.prop = 2;
// expect(dummy).toBe(1);
// expect(queue.length).toBe(1);
console.log(dummy);
console.log(queue.length);
stop(runner);

// a scheduled effect should not execute anymore after stopped
queue.forEach((e) => e());
// expect(dummy).toBe(1);
console.log(dummy);
