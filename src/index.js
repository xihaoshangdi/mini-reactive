import { reactive, ref } from "./lib/reactive.js";
import { observer } from "./lib/reactiveEffect.js";
let $xxx = reactive({ value: 1, aaa: 0 });
let $yyy = reactive({ value: 4 });


observer(function () {
  $xxx.value = $yyy.value;
  console.log("xxx 的 setter yyy 的 getter", $xxx.value);
});
// observer(function () {
//   $yyy.value=$xxx.value;
//   console.log("yyy 的 setter xxx 的 getter", $xxx.value);
// });


console.log("---------------START-----------------");
$yyy.value++;
$yyy.value++;
$yyy.value++;
