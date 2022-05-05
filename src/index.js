import { reactive, ref } from "./lib/reactive.js";
import { observer } from "./lib/reactiveEffect.js";

let dummy;
const list = reactive(["Hello"]);
observer(() => (dummy = list.join(" ")));
console.log("---------------START-----------------");
console.log(dummy);
list[1] = "World!";
console.log(dummy);
list[3] = "Hello!";
console.log(dummy);
