import { reactive, ref } from "./lib/reactive.js";
import { observer } from "./lib/reactiveEffect.js";

let dummy
const obj = reactive({ prop: 'value' })
observer(() => (dummy = 'prop' in obj))
console.log("---------------START-----------------");
console.log(dummy);
delete obj.prop
console.log(dummy);
obj.prop = 12
console.log(dummy);
