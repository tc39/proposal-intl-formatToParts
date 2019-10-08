## `DateTimeFormat.prototype.formatToParts` / `NumberFormat.prototype.formatToParts`
Proposal, specs, tests and reference implementation for DateTimeFormat.prototype.formatToParts and NumberFormat.prototype.formatToParts.

### Status

__Stage 4__

Implementation Progress

 * Polyfill
 * Patch for Gecko

Backpointers

 * https://github.com/tc39/ecma402/issues/30

### Authors

 * Caridy Patiño (@caridy)
 * Eric Ferraiuolo (@ericf)
 * Zibi Braniecki (@zbraniecki)

### Reviewers

TBD

### Informative

This proposal enables locale aware formatting of strings produced by Intl
formatters.

### Usage

```javascript

let dateFormatter = Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
let now = new Date();

let dateStr = dateFormatter.formatToParts(now).map(({type, value}) => {
  switch (type) {
    case 'month': return `<b>${value}</b>`;
    default     : return value;
  }
}).reduce((string, part) => string + part);

console.log(dateFormatter.format(now)); // yields "November 23, 2015"
console.log(dateStr); // yields "<b>November</b> 23, 2015"


let numFormatter = Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'EUR',
});
let amount = -1000;

let numStr = numFormatter.formatToParts(amount).map(({type, value}) => {
  switch (type) {
    case 'currency': return `<b>${value}</b>`;
    case 'number'  : return `<i>${value}</i>`;
    default        : return value;
  }
}).reduce((string, part) => string + part);

console.log(numFormatter.format(amount)); // yields "-€1,000.00"
console.log(numStr); // yields "-<b>€</b><i>1,000.00</i>"
```
