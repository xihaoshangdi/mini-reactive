// rollup.config.js
export default {
  // 核心选项
  input: "src/index.js",
  output: {
    file: "reactive.js",
    format: "umd",
    name:'reaction'
  },
};
