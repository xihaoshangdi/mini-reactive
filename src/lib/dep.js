const targetMap = new WeakMap();

const getDep = function (target, property) {
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map());
  }
  const depsMap = targetMap.get(target);
  if (!depsMap.has(property)) {
    depsMap.set(property, createDep());
  }
  return depsMap.get(property);
};

const getDepMap = function (target) {
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map());
  }
  return targetMap.get(target);
};


const createDep = () => {
  return new Set();
};

export { getDep,getDepMap };
