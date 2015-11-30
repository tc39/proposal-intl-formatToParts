'use strict';

const localeData = require('./locale-data/json/en-US.json');

Intl.DateTimeFormat.prototype.formatToParts = function(date) {
  let options = this.resolvedOptions();
  let formats = createDateTimeFormats(localeData.date.formats);
  let opt = {};
  for (var prop in dateTimeComponents) {
    if (!hop.call(dateTimeComponents, prop))
      continue;

    var value = options[prop];
    opt['[['+prop+']]'] = value;
  }

  let score = calculateScore(opt, formats);
  return FormatToPartsDateTime(score, date);
};

function FormatToPartsDateTime(internal, x) {
    if (!isFinite(x))
        throw new RangeError('Invalid valid date passed to formatToParts');

    var
        locale = 'en-US',
        pattern = internal.pattern,
        nf = new Intl.NumberFormat([locale], {useGrouping: false}),
        nf2 = new Intl.NumberFormat([locale], {minimumIntegerDigits: 2, useGrouping: false}),
        tm = ToLocalTime(x),
        ca = 'gregory',
        caLocaleData = localeData.date.calendars,
        result = [];

    var componentsRe = /{([^}]+)}/g;
    var match;
    var currentIndex = 0;
    while ((match = componentsRe.exec(pattern)) !== null) {
        if (currentIndex < match.index) {
            result.push({
                type: 'separator',
                value: pattern.substr(currentIndex, match.index - currentIndex)
            });
        }
        var p = match[1];
        var fv = null;

        if (hop.call(internal, p)) {
            var pm,
                f = internal[p],
                v = tm['[['+ p +']]'];

            if (p === 'year' && v <= 0)
                v = 1 - v;
            else if (p === 'month')
                v++;
            else if (p === 'hour' && internal['[[hour12]]'] === true) {
                v = v % 12;
                pm = v !== tm['[['+ p +']]'];
                if (v === 0 && internal['[[hourNo0]]'] === true)
                    v = 12;
            }

            if (f === 'numeric')
                fv = v;
            else if (f === '2-digit') {
                fv = v;
                if (fv.length > 2)
                    fv = fv.slice(-2);
            }
            else if (f in dateWidths) {
                switch (p) {
                    case 'month':
                        fv = resolveDateString(caLocaleData, ca, 'months', f, tm['[['+ p +']]']);
                        break;
                    case 'weekday':
                        try {
                            fv = resolveDateString(caLocaleData, ca, 'days', f, tm['[['+ p +']]']);
                        } catch (e) {
                            throw new Error('Could not find weekday data for locale '+locale);
                        }
                        break;
                    case 'timeZoneName':
                        fv = ''; // TODO
                        break;
                    default:
                        fv = tm['[['+ p +']]'];
                }
            }
        } else if (p === 'ampm') {
          fv = resolveDateString(caLocaleData, ca, 'dayPeriods', pm ? 'pm' : 'am');
        }
        if (fv !== null) {
            result.push({
                type: match[1],
                value: fv
            });
            currentIndex = match.index + match[0].length;
        }
    }
    if (currentIndex < pattern.length) {
        result.push({
            type: 'separator',
            value: pattern.substr(currentIndex)
        });
    }

    return result;
}


// core.js
var hop = Object.prototype.hasOwnProperty;
var arrIndexOf = Array.prototype.indexOf;
var dateWidths = Object.create(null, { narrow:{}, short:{}, long:{} });

var dateTimeComponents = {
         weekday: [ "narrow", "short", "long" ],
             era: [ "narrow", "short", "long" ],
            year: [ "2-digit", "numeric" ],
           month: [ "2-digit", "numeric", "narrow", "short", "long" ],
             day: [ "2-digit", "numeric" ],
            hour: [ "2-digit", "numeric" ],
          minute: [ "2-digit", "numeric" ],
          second: [ "2-digit", "numeric" ],
    timeZoneName: [ "short", "long" ]
};

/**
 * Calculates score for BestFitFormatMatcher and BasicFormatMatcher.
 * Abstracted from BasicFormatMatcher section.
 */
function calculateScore (options, formats, bestFit) {
    var
    // Additional penalty type when bestFit === true
       diffDataTypePenalty = 8,

    // 1. Let removalPenalty be 120.
        removalPenalty = 120,

    // 2. Let additionPenalty be 20.
        additionPenalty = 20,

    // 3. Let longLessPenalty be 8.
        longLessPenalty = 8,

    // 4. Let longMorePenalty be 6.
        longMorePenalty = 6,

    // 5. Let shortLessPenalty be 6.
        shortLessPenalty = 6,

    // 6. Let shortMorePenalty be 3.
        shortMorePenalty = 3,

    // 7. Let bestScore be -Infinity.
        bestScore = -Infinity,

    // 8. Let bestFormat be undefined.
        bestFormat,

    // 9. Let i be 0.
        i = 0,

    // 10. Let len be the result of calling the [[Get]] internal method of formats with argument "length".
        len = formats.length;

    // 11. Repeat while i < len:
    while (i < len) {
        var
        // a. Let format be the result of calling the [[Get]] internal method of formats with argument ToString(i).
            format = formats[i],

        // b. Let score be 0.
            score = 0;

        // c. For each property shown in Table 3:
        for (var property in dateTimeComponents) {
            if (!hop.call(dateTimeComponents, property))
                continue;

            var
            // i. Let optionsProp be options.[[<property>]].
                optionsProp = options['[['+ property +']]'],

            // ii. Let formatPropDesc be the result of calling the [[GetOwnProperty]] internal method of format
            //     with argument property.
            // iii. If formatPropDesc is not undefined, then
            //     1. Let formatProp be the result of calling the [[Get]] internal method of format with argument property.
                formatProp = hop.call(format, property) ? format[property] : undefined;

            // iv. If optionsProp is undefined and formatProp is not undefined, then decrease score by
            //     additionPenalty.
            if (optionsProp === undefined && formatProp !== undefined)
                score -= additionPenalty;

            // v. Else if optionsProp is not undefined and formatProp is undefined, then decrease score by
            //    removalPenalty.
            else if (optionsProp !== undefined && formatProp === undefined)
                score -= removalPenalty;

            // vi. Else
            else {
                var
                // 1. Let values be the array ["2-digit", "numeric", "narrow", "short",
                //    "long"].
                    values = [ '2-digit', 'numeric', 'narrow', 'short', 'long' ],

                // 2. Let optionsPropIndex be the index of optionsProp within values.
                    optionsPropIndex = arrIndexOf.call(values, optionsProp),

                // 3. Let formatPropIndex be the index of formatProp within values.
                    formatPropIndex = arrIndexOf.call(values, formatProp),

                // 4. Let delta be max(min(formatPropIndex - optionsPropIndex, 2), -2).
                    delta = Math.max(Math.min(formatPropIndex - optionsPropIndex, 2), -2);

                // When the bestFit argument is true, subtract additional penalty where data types are not the same
                if (bestFit && (
                    ((optionsProp === 'numeric' || optionsProp === '2-digit') && (formatProp !== 'numeric' && formatProp !== '2-digit'))
                 || ((optionsProp !== 'numeric' && optionsProp !== '2-digit') && (formatProp === '2-digit' || formatProp === 'numeric'))
                ))
                    score -= diffDataTypePenalty;

                // 5. If delta = 2, decrease score by longMorePenalty.
                if (delta === 2)
                    score -= longMorePenalty;

                // 6. Else if delta = 1, decrease score by shortMorePenalty.
                else if (delta === 1)
                    score -= shortMorePenalty;

                // 7. Else if delta = -1, decrease score by shortLessPenalty.
                else if (delta === -1)
                    score -= shortLessPenalty;

                // 8. Else if delta = -2, decrease score by longLessPenalty.
                else if (delta === -2)
                    score -= longLessPenalty;
            }
        }

        // d. If score > bestScore, then
        if (score > bestScore) {
            // i. Let bestScore be score.
            bestScore = score;

            // ii. Let bestFormat be format.
            bestFormat = format;
        }

        // e. Increase i by 1.
        i++;
    }

    // 12. Return bestFormat.
    return bestFormat;
}

function ToLocalTime(date, calendar, timeZone) {
  // 1. Apply calendrical calculations on date for the given calendar and time zone to
  //    produce weekday, era, year, month, day, hour, minute, second, and inDST values.
  //    The calculations should use best available information about the specified
  //    calendar and time zone. If the calendar is "gregory", then the calculations must
  //    match the algorithms specified in ES5, 15.9.1, except that calculations are not
  //    bound by the restrictions on the use of best available information on time zones
  //    for local time zone adjustment and daylight saving time adjustment imposed by
  //    ES5, 15.9.1.7 and 15.9.1.8.
  // ###TODO###
  var d = new Date(date),
  m = 'get' + (timeZone || '');

  // 2. Return a Record with fields [[weekday]], [[era]], [[year]], [[month]], [[day]],
  //    [[hour]], [[minute]], [[second]], and [[inDST]], each with the corresponding
  //    calculated value.
  return {
    '[[weekday]]': d[m + 'Day'](),
    '[[era]]'    : +(d[m + 'FullYear']() >= 0),
    '[[year]]'   : d[m + 'FullYear'](),
    '[[month]]'  : d[m + 'Month'](),
    '[[day]]'    : d[m + 'Date'](),
    '[[hour]]'   : d[m + 'Hours'](),
    '[[minute]]' : d[m + 'Minutes'](),
    '[[second]]' : d[m + 'Seconds'](),
    '[[inDST]]'  : false // ###TODO###
  };
}

function resolveDateString(data, ca, component, width, key) {
    // From http://www.unicode.org/reports/tr35/tr35.html#Multiple_Inheritance:
    // 'In clearly specified instances, resources may inherit from within the same locale.
    //  For example, ... the Buddhist calendar inherits from the Gregorian calendar.'
    var obj = data[ca] && data[ca][component]
                ? data[ca][component]
                : data.gregory[component],

        // "sideways" inheritance resolves strings when a key doesn't exist
        alts = {
            narrow: ['short', 'long'],
            short:  ['long', 'narrow'],
            long:   ['short', 'narrow']
        },

        //
        resolved = hop.call(obj, width)
                  ? obj[width]
                  : hop.call(obj, alts[width][0])
                      ? obj[alts[width][0]]
                      : obj[alts[width][1]];

    // `key` wouldn't be specified for components 'dayPeriods'
    return key != null ? resolved[key] : resolved;
}

// CLDR

// Match these datetime components in a CLDR pattern, except those in single quotes
var expDTComponents = /(?:[Eec]{1,6}|G{1,5}|(?:[yYu]+|U{1,5})|[ML]{1,5}|d{1,2}|a|[hkHK]{1,2}|m{1,2}|s{1,2}|z{1,4})(?=([^']*'[^']*')*[^']*$)/g;

// Skip over patterns with these datetime components
var unwantedDTCs = /[QxXVOvZASjgFDwWIQqH]/;

// Maps the number of characters in a CLDR pattern to the specification
var dtcLengthMap = {
        month:   [ 'numeric', '2-digit', 'short', 'long', 'narrow' ],
        weekday: [ 'short', 'short', 'short', 'long', 'narrow' ],
        era:     [ 'short', 'short', 'short', 'long', 'narrow' ]
    };

var dtKeys = ["weekday", "era", "year", "month", "day"];
var tmKeys = ["hour", "minute", "second", "timeZoneName"];

function isDateFormatOnly(obj) {
    for (var i = 0; i < tmKeys.length; i += 1) {
        if (obj.hasOwnProperty(tmKeys[i])) {
            return false;
        }
    }
    return true;
}

function isTimeFormatOnly(obj) {
    for (var i = 0; i < dtKeys.length; i += 1) {
        if (obj.hasOwnProperty(dtKeys[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Converts the CLDR availableFormats into the objects and patterns required by
 * the ECMAScript Internationalization API specification.
 */
function createDateTimeFormat(format) {
    if (unwantedDTCs.test(format))
        return undefined;

    var formatObj = {};

    // Replace the pattern string with the one required by the specification, whilst
    // at the same time evaluating it for the subsets and formats
    formatObj.pattern = format.replace(expDTComponents, function ($0) {
        // See which symbol we're dealing with
        switch ($0.charAt(0)) {
            case 'E':
            case 'e':
            case 'c':
                formatObj.weekday = dtcLengthMap.weekday[$0.length-1];
                return '{weekday}';

            // Not supported yet
            case 'G':
                formatObj.era = dtcLengthMap.era[$0.length-1];
                return '{era}';

            case 'y':
            case 'Y':
            case 'u':
            case 'U':
                formatObj.year = $0.length === 2 ? '2-digit' : 'numeric';
                return '{year}';

            case 'M':
            case 'L':
                formatObj.month = dtcLengthMap.month[$0.length-1];
                return '{month}';

            case 'd':
                formatObj.day = $0.length === 2 ? '2-digit' : 'numeric';
                return '{day}';

            case 'a':
                return '{ampm}';

            case 'h':
            case 'H':
            case 'k':
            case 'K':
                formatObj.hour = $0.length === 2 ? '2-digit' : 'numeric';
                return '{hour}';

            case 'm':
                formatObj.minute = $0.length === 2 ? '2-digit' : 'numeric';
                return '{minute}';

            case 's':
                formatObj.second = $0.length === 2 ? '2-digit' : 'numeric';
                return '{second}';

            case 'z':
                formatObj.timeZoneName = $0.length < 4 ? 'short' : 'long';
                return '{timeZoneName}';
        }
    });

    // From http://www.unicode.org/reports/tr35/tr35-dates.html#Date_Format_Patterns:
    //  'In patterns, two single quotes represents a literal single quote, either
    //   inside or outside single quotes. Text within single quotes is not
    //   interpreted in any way (except for two adjacent single quotes).'
    formatObj.pattern = formatObj.pattern.replace(/'([^']*)'/g, function ($0, literal) {
        return literal ? literal : "'";
    });

    if (formatObj.pattern.indexOf('{ampm}') > -1) {
        formatObj.hour12 = true;
        formatObj.pattern12 = formatObj.pattern;
        formatObj.pattern = formatObj.pattern.replace('{ampm}', '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }

    return formatObj;
}

/**
 * Processes DateTime formats from CLDR to an easier-to-parse format.
 * the result of this operation should be cached the first time a particular
 * calendar is analyzed.
 *
 * The specification requires we support at least the following subsets of
 * date/time components:
 *
 *   - 'weekday', 'year', 'month', 'day', 'hour', 'minute', 'second'
 *   - 'weekday', 'year', 'month', 'day'
 *   - 'year', 'month', 'day'
 *   - 'year', 'month'
 *   - 'month', 'day'
 *   - 'hour', 'minute', 'second'
 *   - 'hour', 'minute'
 *
 * We need to cherry pick at least these subsets from the CLDR data and convert
 * them into the pattern objects used in the ECMA-402 API.
 */
function createDateTimeFormats(formats) {
    var availableFormats = formats.availableFormats;
    var timeFormats = formats.timeFormats;
    var dateFormats = formats.dateFormats;
    var order = formats.medium;
    var result = [];
    var key, format, computed, i, j;
    var timeRelatedFormats = [];
    var dateRelatedFormats = [];

    function expandFormat(key, pattern) {
        // Expand component lengths if necessary, as allowed in the LDML spec
        // Get the lengths of 'M' and 'E' substrings in the date pattern
        // as arrays that can be joined to create a new substring
        var M = new Array((key.match(/M/g)||[]).length + 1);
        var E = new Array((key.match(/E/g)||[]).length + 1);

        // note from caridy: I'm not sure we really need this, seems to be
        //                   useless since it relies on the keys from CLDR
        //                   instead of the actual format pattern, but I'm not sure.
        if (M.length > 2)
            pattern = pattern.replace(/(M|L)+/, M.join('$1'));

        if (E.length > 2)
            pattern = pattern.replace(/([Eec])+/, E.join('$1'));

        return pattern;
    }

    // Map available (custom) formats into a pattern for createDateTimeFormats
    for (key in availableFormats) {
        if (availableFormats.hasOwnProperty(key)) {
            format = expandFormat(key, availableFormats[key]);
            computed = createDateTimeFormat(format);
            if (computed) {
                result.push(computed);
                // in some cases, the format is only displaying date specific props
                // or time specific props, in which case we need to also produce the
                // combined formats.
                if (isDateFormatOnly(computed)) {
                    dateRelatedFormats.push(format);
                } else if (isTimeFormatOnly(computed)) {
                    timeRelatedFormats.push(format);
                }
            }
        }
    }

    // combine custom time and custom date formats when they are orthogonals to complete the
    // formats supported by browsers by relying on the value of "formats.medium" which defines
    // how to join custom formats into a single pattern.
    for (i = 0; i < timeRelatedFormats.length; i += 1) {
        for (j = 0; j < dateRelatedFormats.length; j += 1) {
            format = order
                .replace('{0}', timeRelatedFormats[i])
                .replace('{1}', dateRelatedFormats[j])
                .replace(/^[,\s]+|[,\s]+$/gi, '');
            computed = createDateTimeFormat(format);
            if (computed) {
                result.push(computed);
            }
        }
    }

    // Map time formats into a pattern for createDateTimeFormats
    for (key in timeFormats) {
        if (timeFormats.hasOwnProperty(key)) {
            format = expandFormat(key, timeFormats[key]);
            computed = createDateTimeFormat(format);
            if (computed) {
                result.push(computed);
            }
        }
    }

    // Map date formats into a pattern for createDateTimeFormats
    for (key in dateFormats) {
        if (dateFormats.hasOwnProperty(key)) {
            format = expandFormat(key, dateFormats[key]);
            computed = createDateTimeFormat(format);
            if (computed) {
                result.push(computed);
            }
        }
    }

    return result;
}
