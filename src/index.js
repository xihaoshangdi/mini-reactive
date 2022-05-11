import { reactive, ref, toRaw } from "./lib/reactive.js";
import { observer, stop,effect } from "./lib/reactiveEffect.js";

(['push', 'unshift']).forEach(key => {
  const arr = reactive([])
  const counterSpy1 = () => (arr[key])(1)
  const counterSpy2 = () => (arr[key])(2)
  effect(counterSpy1)
  debugger
  effect(counterSpy2)
  // expect(arr.length).toBe(2)
  console.log(arr.length,arr);
  // expect(counterSpy1).toHaveBeenCalledTimes(1)
  // expect(counterSpy2).toHaveBeenCalledTimes(1)
})
// (['pop', 'shift']).forEach(key => {
//   const arr = reactive([1, 2, 3, 4])
//   const counterSpy1 = jest.fn(() => (arr[key])())
//   const counterSpy2 = jest.fn(() => (arr[key])())
//   effect(counterSpy1)
//   effect(counterSpy2)
//   expect(arr.length).toBe(2)
//   expect(counterSpy1).toHaveBeenCalledTimes(1)
//   expect(counterSpy2).toHaveBeenCalledTimes(1)
// })
