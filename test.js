'use strict';

require('./polyfill.js');


let dateFormatter = Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
let now = new Date();

let dateStr = dateFormatter.formatToParts(now).map(part => {
  const type = part.type;
  const value = part.value;

  switch (type) {
    case 'month': return `<b>${value}</b>`;
    default     : return value;
  }
}).reduce((string, part) => string + part);

console.log(dateFormatter.format(now)); // yields "November 23, 2015"
console.log(dateStr); // yields "<b>November</b> 23, 2015"
