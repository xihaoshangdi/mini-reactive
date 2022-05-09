import { reactive, ref, toRaw } from "./lib/reactive.js";
import { observer, stop } from "./lib/reactiveEffect.js";

let dummy;
const obj = reactive({});
observer(() => {
  for (const key in obj) {
    dummy = obj[key];
  }
  dummy = obj.prop;
});

obj.prop = 16;

