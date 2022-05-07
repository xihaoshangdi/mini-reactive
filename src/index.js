import { reactive, ref, toRaw } from "./lib/reactive.js";
import { observer } from "./lib/reactiveEffect.js";

let dummy
const obj = reactive({ prop: 'value', run: true })

const conditionalSpy = () => {
    dummy = obj.run ? obj.prop : 'other'
  }
observer(conditionalSpy)


obj.run = false
debugger
obj.prop = 'value2'

