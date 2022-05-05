import { observer, track, trigger, currentEffect } from "../lib/reactiveEffect.js";
import { reactive, ref } from "../lib/reactive.js";

describe("副作用相关的测试用例",()=>{
  it("传递给(observer)的方法,会立即执行一次", () => {
    const fnSpy = jest.fn(() => {});
    observer(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1)
  });

  it('基本类型赋值：observer监听时初始化值，副作用触发时修改值', () => {
    let dummy
    const counter = reactive({ num: 0 })
    observer(() => (dummy = counter.num))
  
    expect(dummy).toBe(0)
    counter.num = 7
    expect(dummy).toBe(7)
  })

  it('应观察到多种属性', () => {
    let dummy
    const counter = reactive({ num1: 0, num2: 0 })
    observer(() => (dummy = counter.num1 + counter.num1 + counter.num2))
  
    expect(dummy).toBe(0)
    counter.num1 = counter.num2 = 7
    expect(dummy).toBe(21)
  })

  it('一个响应式数据能够触发多个副作用', () => {
    let dummy1, dummy2
    const counter = reactive({ num: 0 })
    observer(() => (dummy1 = counter.num))
    observer(() => (dummy2 = counter.num))
  
    expect(dummy1).toBe(0)
    expect(dummy2).toBe(0)
    counter.num++
    expect(dummy1).toBe(1)
    expect(dummy2).toBe(1)
  })

  it('嵌套的 reactive 做出改变时，副作用也会触发', () => {
    let dummy
    const counter = reactive({ nested: { num: 0 } })
    observer(() => (dummy = counter.nested.num))
    
    expect(dummy).toBe(0)
    counter.nested.num = 8
    expect(dummy).toBe(8)
  })

  it('reactive 进行删除属性操作时,副作用也会触发', () => {
    let dummy
    const obj = reactive({ prop: 'value' })
    observer(() => (dummy = obj.prop))
  
    expect(dummy).toBe('value')
    delete obj.prop
    expect(dummy).toBe(undefined)
  })

  it('reactive 进行删除添加属性操作时,副作用也会触发', () => {
    let dummy
    const obj = reactive({ prop: 'value' })
    observer(() => (dummy = 'prop' in obj))
  
    expect(dummy).toBe(true)
    delete obj.prop
    expect(dummy).toBe(false)
    obj.prop = 12
    expect(dummy).toBe(true)
  })

})



