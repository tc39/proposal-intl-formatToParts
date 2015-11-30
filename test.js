require('./polyfill.js');


var formatter = Intl.DateTimeFormat('en', {
  year: '2-digit',
  month: 'long',
  day: 'numeric'
});
var now = new Date();

console.log(formatter.formatToParts(now));
