
let docWidth = document.documentElement.offsetWidth;
let wideElements = [];
document.querySelectorAll('*').forEach(el => {
  let rect = el.getBoundingClientRect();
  if (rect.right > 375 + 1) {
    wideElements.push({
      tag: el.tagName,
      id: el.id,
      className: el.className,
      right: rect.right,
      width: rect.width
    });
  }
});
console.log('Total wide elements:', wideElements.length);
wideElements.slice(0, 10).forEach(e => console.log(JSON.stringify(e)));
