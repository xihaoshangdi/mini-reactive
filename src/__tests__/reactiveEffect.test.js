import {
  observer,
  track,
  trigger,
  currentEffect,
} from "../lib/reactiveEffect.js";
import { reactive, ref } from "../lib/reactive.js";

describe("副作用相关的测试用例", () => {
  // should run the passed function once (wrapped by a effect)
  it("传递给(observer)的方法,会立即执行一次", () => {
    const fnSpy = jest.fn(() => {});
    observer(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });
  // should observe basic properties
  it("基本类型赋值：observer监听时初始化值，副作用触发时修改值", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    observer(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  });
  // should observe multiple properties
  it("应观察到多种属性", () => {
    let dummy;
    const counter = reactive({ num1: 0, num2: 0 });
    observer(() => (dummy = counter.num1 + counter.num1 + counter.num2));

    expect(dummy).toBe(0);
    counter.num1 = counter.num2 = 7;
    expect(dummy).toBe(21);
  });
  //should handle multiple effects
  it("一个响应式数据能够触发多个副作用", () => {
    let dummy1, dummy2;
    const counter = reactive({ num: 0 });
    observer(() => (dummy1 = counter.num));
    observer(() => (dummy2 = counter.num));

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    counter.num++;
    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });
  // should observe nested properties
  it("嵌套的 reactive 做出改变时，副作用也会触发", () => {
    let dummy;
    const counter = reactive({ nested: { num: 0 } });
    observer(() => (dummy = counter.nested.num));

    expect(dummy).toBe(0);
    counter.nested.num = 8;
    expect(dummy).toBe(8);
  });
  // should observe delete operations
  it("reactive 进行删除属性操作时,副作用也会触发", () => {
    let dummy;
    const obj = reactive({ prop: "value" });
    observer(() => (dummy = obj.prop));

    expect(dummy).toBe("value");
    delete obj.prop;
    expect(dummy).toBe(undefined);
  });
  // should observe has operations
  it("reactive 进行删除添加属性操作时,副作用也会触发", () => {
    let dummy;
    const obj = reactive({ prop: "value" });
    observer(() => (dummy = "prop" in obj));

    expect(dummy).toBe(true);
    delete obj.prop;
    expect(dummy).toBe(false);
    obj.prop = 12;
    expect(dummy).toBe(true);
  });
  // should observe properties on the prototype chain
  it("原型链上的属性变动也应该触发副作用", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    const parentCounter = reactive({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    observer(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    delete counter.num;
    expect(dummy).toBe(2);
    parentCounter.num = 4;
    expect(dummy).toBe(4);
    counter.num = 3;
    expect(dummy).toBe(3);
  });
  // should observe inherited property accessors
  it('应该遵守继承的属性访问器', () => {
    let dummy, parentDummy, hiddenValue
    const obj = reactive({})
    const parent = reactive({
      set prop(value) {
        hiddenValue = value
      },
      get prop() {
        return hiddenValue
      }
    })
    Object.setPrototypeOf(obj, parent)
    observer(() => (dummy = obj.prop))
    observer(() => (parentDummy = parent.prop))
  
    expect(dummy).toBe(undefined)
    expect(parentDummy).toBe(undefined)
    obj.prop = 4
    expect(dummy).toBe(4)
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2
    expect(dummy).toBe(2)
    expect(parentDummy).toBe(2)
  })
  // should observe function call chains
  it('函数调用产生的副作用也可以收集', () => {
    let dummy
    const counter = reactive({ num: 0 })
    observer(() => (dummy = getNum()))
  
    function getNum() {
      return counter.num
    }
  
    expect(dummy).toBe(0)
    counter.num = 2
    expect(dummy).toBe(2)
  })
  // should observe iteration
  it('数组的变动也会触发副作用', () => {
    let dummy
    const list = reactive(['Hello'])
    observer(() => (dummy = list.join(' ')))
  
    expect(dummy).toBe('Hello')
    list.push('World!')
    expect(dummy).toBe('Hello World!')
    list.shift()
    expect(dummy).toBe('World!')
  })
  // should observe implicit array length changes
  it('数组下标改变应触发副作用', () => {
    let dummy
    const list = reactive(['Hello'])
    observer(() => (dummy = list.join(' ')))
  
    expect(dummy).toBe('Hello')
    list[1] = 'World!'
    expect(dummy).toBe('Hello World!')
    list[3] = 'Hello!'
    expect(dummy).toBe('Hello World!  Hello!')
  })
  // should observe sparse array mutations
  it('数组长度内容改变应触发副作用', () => {
    let dummy
    const list = reactive([])
    list[1] = 'World!'
    observer(() => (dummy = list.join(' ')))
  
    expect(dummy).toBe(' World!')
    list[0] = 'Hello'
    expect(dummy).toBe('Hello World!')
    list.pop()
    expect(dummy).toBe('Hello')
  })
});
