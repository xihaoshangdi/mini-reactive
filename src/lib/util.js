export const isObject = (val) => {
  return val !== null && typeof val === "object";
};
export const isString = (val) => typeof val === "string";
export const isArray = Array.isArray;
export const isSymbol = (val) => typeof val === "symbol";

export const isIntegerKey = (key) =>
  isString(key) &&
  key !== "NaN" &&
  key[0] !== "-" &&
  "" + parseInt(key, 10) === key;

export const hasOwn = (val, key) => hasOwnProperty.call(val, key);

export const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
