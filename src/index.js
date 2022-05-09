import { reactive, ref, toRaw } from "./lib/reactive.js";
import { observer } from "./lib/reactiveEffect.js";

let dummy = 0;
const numbers = reactive({ num1: 3 });
observer(() => {
  dummy = 0;
  for (let key in numbers) {
    dummy += numbers[key]; 
  }
});
debugger
numbers.num2 = 4;
 
