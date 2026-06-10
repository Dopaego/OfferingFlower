console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

async function fn() {
  console.log('4');
  await null;
  console.log('5');
}

fn();

console.log('6');

// 1, 4,6,3, 5,2
