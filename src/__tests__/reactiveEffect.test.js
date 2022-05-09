import { observer,stop } from "../lib/reactiveEffect.js";
import { reactive, ref,toRaw } from "../lib/reactive.js";

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
  it("应该遵守继承的属性访问器", () => {
    let dummy, parentDummy, hiddenValue;
    const obj = reactive({});
    const parent = reactive({
      set prop(value) {
        hiddenValue = value;
      },
      get prop() {
        return hiddenValue;
      },
    });
    Object.setPrototypeOf(obj, parent);
    observer(() => (dummy = obj.prop));
    observer(() => (parentDummy = parent.prop));

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    obj.prop = 4;
    expect(dummy).toBe(4);
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2;
    expect(dummy).toBe(2);
    expect(parentDummy).toBe(2);
  });
  // should observe function call chains
  it("函数调用产生的副作用也可以收集", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    observer(() => (dummy = getNum()));

    function getNum() {
      return counter.num;
    }

    expect(dummy).toBe(0);
    counter.num = 2;
    expect(dummy).toBe(2);
  });
  // should observe iteration
  it("数组的变动也会触发副作用", () => {
    let dummy;
    const list = reactive(["Hello"]);
    observer(() => (dummy = list.join(" ")));

    expect(dummy).toBe("Hello");
    list.push("World!");
    expect(dummy).toBe("Hello World!");
    list.shift();
    expect(dummy).toBe("World!");
  });
  // should observe implicit array length changes
  it("数组下标改变应触发副作用", () => {
    let dummy;
    const list = reactive(["Hello"]);
    observer(() => (dummy = list.join(" ")));

    expect(dummy).toBe("Hello");
    list[1] = "World!";
    expect(dummy).toBe("Hello World!");
    list[3] = "Hello!";
    expect(dummy).toBe("Hello World!  Hello!");
  });
  // should observe sparse array mutations
  it("数组长度内容改变应触发副作用", () => {
    let dummy;
    const list = reactive([]);
    list[1] = "World!";
    observer(() => (dummy = list.join(" ")));

    expect(dummy).toBe(" World!");
    list[0] = "Hello";
    expect(dummy).toBe("Hello World!");
    list.pop();
    expect(dummy).toBe("Hello");
  });
  // should observe enumeration
  it("计算操作应触发副作用", () => {
    let dummy = 0;
    const numbers = reactive({ num1: 3 });
    observer(() => {
      dummy = 0;
      for (let key in numbers) {
        dummy += numbers[key];
      }
    });

    expect(dummy).toBe(3);
    numbers.num2 = 4;
    expect(dummy).toBe(7);
    delete numbers.num1;
    expect(dummy).toBe(4);
  });
  // should observe symbol keyed properties
  it("Symbol 类型应触发副作用", () => {
    const key = Symbol("symbol keyed prop");
    let dummy, hasDummy;
    const obj = reactive({ [key]: "value" });
    observer(() => (dummy = obj[key]));
    observer(() => (hasDummy = key in obj));

    expect(dummy).toBe("value");
    expect(hasDummy).toBe(true);
    obj[key] = "newValue";
    expect(dummy).toBe("newValue");
    delete obj[key];
    expect(dummy).toBe(undefined);
    expect(hasDummy).toBe(false);
  });
  // should not observe well-known symbol keyed properties
  it("well-known symbol 不应被观察", () => {
    const key = Symbol.isConcatSpreadable;
    let dummy;
    const array = reactive([]);
    observer(() => (dummy = array[key]));

    expect(array[key]).toBe(undefined);
    expect(dummy).toBe(undefined);
    array[key] = true;
    expect(array[key]).toBe(true);
    expect(dummy).toBe(undefined);
  });
  // should observe function valued properties
  it("function 的变更应触发副作用", () => {
    const oldFunc = () => {};
    const newFunc = () => {};

    let dummy;
    const obj = reactive({ func: oldFunc });
    observer(() => (dummy = obj.func));

    expect(dummy).toBe(oldFunc);
    obj.func = newFunc;
    expect(dummy).toBe(newFunc);
  });
  // should observe chained getters relying on this
  it("链式调用的get也应被观察", () => {
    const obj = reactive({
      a: 1,
      get b() {
        return this.a;
      },
    });

    let dummy;
    observer(() => (dummy = obj.b));
    expect(dummy).toBe(1);
    obj.a++;
    expect(dummy).toBe(2);
  });
  // should observe methods relying on this
  it("依赖的方法也应触发副作用", () => {
    const obj = reactive({
      a: 1,
      b() {
        return this.a;
      },
    });

    let dummy;
    observer(() => (dummy = obj.b()));
    expect(dummy).toBe(1);
    obj.a++;
    expect(dummy).toBe(2);
  });
  // should not observe set operations without a value change
  it("不应在没有值变化的情况下观察设置操作", () => {
    let hasDummy, getDummy;
    const obj = reactive({ prop: "value" });

    const getSpy = jest.fn(() => (getDummy = obj.prop));
    const hasSpy = jest.fn(() => (hasDummy = "prop" in obj));
    observer(getSpy);
    observer(hasSpy);

    expect(getDummy).toBe("value");
    expect(hasDummy).toBe(true);
    obj.prop = "value";
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(hasSpy).toHaveBeenCalledTimes(1);
    expect(getDummy).toBe("value");
    expect(hasDummy).toBe(true);
  });
  // should not observe raw mutations
  it('不应观察原始值改变', () => {
    let dummy
    const obj = reactive({})
    observer(() => (dummy = toRaw(obj).prop))
  
    expect(dummy).toBe(undefined)
    obj.prop = 'value'
    expect(dummy).toBe(undefined)
  })
  // should not be triggered by raw mutations
  it('不应被原始值改变触发副作用', () => {
    let dummy
    const obj = reactive({})
    observer(() => (dummy = obj.prop))
  
    expect(dummy).toBe(undefined)
    toRaw(obj).prop = 'value'
    expect(dummy).toBe(undefined)
  }) 
  // should not be triggered by inherited raw setters
  it('不应被继承了响应式的原始值改变触发副作用', () => {
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
    toRaw(obj).prop = 4
    expect(dummy).toBe(undefined)
    expect(parentDummy).toBe(undefined)
  })
  // should avoid implicit infinite recursive loops with itself
  it('应避免与自己隐含的无限递归循环', () => {
    const counter = reactive({ num: 0 })
    const counterSpy = jest.fn(() => counter.num++)
    observer(counterSpy)
    expect(counter.num).toBe(1)
    expect(counterSpy).toHaveBeenCalledTimes(1)
    counter.num = 4
    expect(counter.num).toBe(5)
    expect(counterSpy).toHaveBeenCalledTimes(2)
  })
  // should avoid infinite loops with other effects
  it('应避免与其他效果的无限循环', () => {
    const nums = reactive({ num1: 0, num2: 1 })
  
    const spy1 = jest.fn(() => (nums.num1 = nums.num2))
    const spy2 = jest.fn(() => (nums.num2 = nums.num1))
    observer(spy1)
    observer(spy2)
    expect(nums.num1).toBe(1)
    expect(nums.num2).toBe(1)
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)
    nums.num2 = 4
    expect(nums.num1).toBe(4)
    expect(nums.num2).toBe(4)
    expect(spy1).toHaveBeenCalledTimes(2)
    expect(spy2).toHaveBeenCalledTimes(2)
    nums.num1 = 10
    expect(nums.num1).toBe(10)
    expect(nums.num2).toBe(10)
    expect(spy1).toHaveBeenCalledTimes(3)
    expect(spy2).toHaveBeenCalledTimes(3)
  })
  // should allow explicitly recursive raw function loops
  it('应当可以显式触发', () => {
    const counter = reactive({ num: 0 })
    const numSpy = jest.fn(() => {
      counter.num++
      if (counter.num < 10) {
        numSpy()
      }
    })
    observer(numSpy)
    expect(counter.num).toEqual(10)
    expect(numSpy).toHaveBeenCalledTimes(10)
  })
  // should return a new reactive version of the function
  it('每次观察应返回新函数', () => {
    function greet() {
      return 'Hello World'
    }
    const effect1 = observer(greet)
    const effect2 = observer(greet)
    expect(typeof effect1).toBe('function')
    expect(typeof effect2).toBe('function')
    expect(effect1).not.toBe(greet)
    expect(effect1).not.toBe(effect2)
  })
  // should discover new branches while running automatically
  it('应在自动运行时发现新的分支', () => {
    let dummy
    const obj = reactive({ prop: 'value', run: false })
  
    const conditionalSpy = jest.fn(() => {
      dummy = obj.run ? obj.prop : 'other'
    })
    observer(conditionalSpy)
  
    expect(dummy).toBe('other')
    expect(conditionalSpy).toHaveBeenCalledTimes(1)
    obj.prop = 'Hi'
    expect(dummy).toBe('other')
    expect(conditionalSpy).toHaveBeenCalledTimes(1)
    obj.run = true
    expect(dummy).toBe('Hi')
    expect(conditionalSpy).toHaveBeenCalledTimes(2)
    obj.prop = 'World'
    expect(dummy).toBe('World')
    expect(conditionalSpy).toHaveBeenCalledTimes(3)
  })
  // should discover new branches when running manually
  it('手动运行时应发现新的分支', () => {
    let dummy
    let run = false
    const obj = reactive({ prop: 'value' })
    const runner = observer(() => {
      dummy = run ? obj.prop : 'other'
    })
  
    expect(dummy).toBe('other')
    runner()
    expect(dummy).toBe('other')
    run = true
    runner()
    expect(dummy).toBe('value')
    obj.prop = 'World'
    expect(dummy).toBe('World')
  })
  // should not be triggered by mutating a property, which is used in an inactive branch
  it('非活动的属性不应触发副作用', () => {
    let dummy
    const obj = reactive({ prop: 'value', run: true })
  
    const conditionalSpy = jest.fn(() => {
      dummy = obj.run ? obj.prop : 'other'
    })
    observer(conditionalSpy)
  
    expect(dummy).toBe('value')
    expect(conditionalSpy).toHaveBeenCalledTimes(1)
    obj.run = false
    expect(dummy).toBe('other')
    expect(conditionalSpy).toHaveBeenCalledTimes(2)
    obj.prop = 'value2'
    expect(dummy).toBe('other')
    expect(conditionalSpy).toHaveBeenCalledTimes(2)
  })
  // should not double wrap if the passed function is a effect
  it('每次返回的是一个新函数，原始对象是同一个', () => {
    const runner = observer(() => {})
    const otherRunner = observer(runner)
    expect(runner).not.toBe(otherRunner)
    expect(runner.raw).toBe(otherRunner.raw)
  })
  // should not run multiple times for a single mutation
  it('单一的改变只会执行一次', () => {
    let dummy
    const obj = reactive({})
    const fnSpy = jest.fn(() => {
      for (const key in obj) {
        dummy = obj[key]
      }
      dummy = obj.prop
    })
    observer(fnSpy)
  
    expect(fnSpy).toHaveBeenCalledTimes(1)
    obj.prop = 16
    expect(dummy).toBe(16)
    expect(fnSpy).toHaveBeenCalledTimes(2)
  })
  // should allow nested effects
  it('observer 可以嵌套', () => {
    const nums = reactive({ num1: 0, num2: 1, num3: 2 })
    const dummy= {}
  
    const childSpy = jest.fn(() => (dummy.num1 = nums.num1))
    const childeffect = observer(childSpy)
    const parentSpy = jest.fn(() => {
      dummy.num2 = nums.num2
      childeffect()
      dummy.num3 = nums.num3
    })
    observer(parentSpy)
  
    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 })
    expect(parentSpy).toHaveBeenCalledTimes(1)
    expect(childSpy).toHaveBeenCalledTimes(2)
    // this should only call the childeffect
    nums.num1 = 4
    expect(dummy).toEqual({ num1: 4, num2: 1, num3: 2 })
    expect(parentSpy).toHaveBeenCalledTimes(1)
    expect(childSpy).toHaveBeenCalledTimes(3)
    // this calls the parenteffect, which calls the childeffect once
    nums.num2 = 10
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 2 })
    expect(parentSpy).toHaveBeenCalledTimes(2)
    expect(childSpy).toHaveBeenCalledTimes(4)
    // this calls the parenteffect, which calls the childeffect once
    nums.num3 = 7
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 7 })
    expect(parentSpy).toHaveBeenCalledTimes(3)
    expect(childSpy).toHaveBeenCalledTimes(5)
  })
  // should observe json methods
  it('JSON 方法可以响应', () => {
    let dummy = {}
    const obj = reactive({})
    observer(() => {
      dummy = JSON.parse(JSON.stringify(obj))
    })
    obj.a = 1
    expect(dummy.a).toBe(1)
  })
  // should observe class method invocations
  it('Class 方法调用可以观察 ', () => {
    class Model {
      constructor() {
        this.count = 0
      }
      inc() {
        this.count++
      }
    }
    const model = reactive(new Model())
    let dummy
    observer(() => {
      dummy = model.count
    })
    expect(dummy).toBe(0)
    model.inc()
    expect(dummy).toBe(1)
  })
  // lazy
  it('lazy', () => {
    const obj = reactive({ foo: 1 })
    let dummy
    const runner = observer(() => (dummy = obj.foo), { lazy: true })
    expect(dummy).toBe(undefined)
  
    expect(runner()).toBe(1)
    expect(dummy).toBe(1)
    obj.foo = 2
    expect(dummy).toBe(2)
  })
  // scheduler
  it('scheduler', () => {
    let dummy
    let run
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = observer(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    )
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    // should be called on first trigger
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    // should not run yet
    expect(dummy).toBe(1)
    // manually run
    run()
    // should have run
    expect(dummy).toBe(2)
  })
  // stop
  // it('stop', () => {
  //   let dummy
  //   const obj = reactive({ prop: 1 })
  //   const runner = observer(() => {
  //     dummy = obj.prop
  //   })
  //   obj.prop = 2
  //   expect(dummy).toBe(2)
  //   stop(runner)
  //   obj.prop = 3
  //   expect(dummy).toBe(2)

  //   // stopped effect should still be manually callable
  //   runner()
  //   expect(dummy).toBe(3)
  // })
  // should not be triggered when the value and the old value both are NaN
  it('NaN 应当触发', () => {
    const obj = reactive({
      foo: NaN
    })
    const fnSpy = jest.fn(() => obj.foo)
    observer(fnSpy)
    obj.foo = NaN
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })
  // should trigger all effects when array length is set to 0
  it('数组长度为0 触发所有的副作用', () => {
    const observed = reactive([1])
    let dummy, record
    observer(() => {
      dummy = observed.length
    })
    observer(() => {
      record = observed[0]
    })
    expect(dummy).toBe(1)
    expect(record).toBe(1)

    observed[1] = 2
    expect(observed[1]).toBe(2)

    observed.unshift(3)
    expect(dummy).toBe(3)
    expect(record).toBe(3)

    observed.length = 0
    expect(dummy).toBe(0)
    expect(record).toBeUndefined()
  })
});
