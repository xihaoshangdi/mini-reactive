import { reactive, ref } from "./lib/reactive.js";
import { observer } from "./lib/reactiveEffect.js";




const key = Symbol.isConcatSpreadable
let dummy
const array= reactive([])
observer(() => (dummy = array[key]))

// expect(array[key]).toBe(undefined)
// expect(dummy).toBe(undefined)
debugger
array[key] = true
// expect(array[key]).toBe(true)
// expect(dummy).toBe(undefined)