#!/usr/bin/env node
var yargs = require('yargs')
  .usage('$0 [options]')
  .describe('in-states', 'the states CSV file')
  .default('in-states', 'input/geo/states.csv')
  .describe('state-field', 'the state abbreviation field to match up with states')
  .default('state-field', 'Region')
  .describe('if', 'input format')
  .default('if', 'ndjson')
  .describe('of', 'output format')
  .default('of', 'ndjson')
  .alias('h', 'help')
  .wrap(100);

var options = yargs.argv;
if (options.help) {
  return yargs.showHelp();
}

var tito = require('tito').formats;
var util = require('../../lib/util');
var parse = require('../../lib/parse');
var async = require('async');
var thru = require('through2').obj;

var statesByAbbr;
var yearField = 'Year';
var stateField = options['state-field'];
var volumeField = 'Production Volume';

const WITHHELD = 'Withheld';

async.series([
  options['in-states'] ? loadStates : noop,
  main
], function(error) {
  if (error) return console.error('error:', error);
});

var keys;

function main(done) {
  var onError = function(error) {
    // console.warn('error:', error);
  };
  process.stdin
    .pipe(tito.createReadStream(options['if']))
    .on('error', onError)
    .pipe(thru(function(d, enc, next) {
      d = normalize(d);
      if (statesByAbbr) {
        fixFIPS(d);
      }
      if (!d.Volume) {
        /*
        if (!keys) {
          keys = Object.keys(d);
          console.warn(keys.join('\t'));
        }
        console.warn('xxx', keys.map(function(k) { return d[k]; }).join('\t'));
        */
        // return next();
      }
      next(null, d);
    }))
    .on('error', onError)
    .pipe(tito.createWriteStream(options['of']))
    .on('error', onError)
    .pipe(process.stdout)
    .on('error', onError)
    .on('end', done);
}

function normalize(d) {
  util.trimKeys(d);
  var volume = isWithheld(d)
    ? 'W'
    : parse.number(d[volumeField]);
  var commodity = (d.Commodity || '').trim();
  if (commodity === 'Other Products') {
    commodity = util.normalizeCommodity(d.Product);
    // console.warn('Other Products ->', commodity);
  } else {
    commodity = util.normalizeCommodity(commodity);
  }
  return {
    Year:       d[yearField],
    State:      d[stateField],
    County:     d.Area,
    FIPS:       d.FIPS,
    Commodity:  commodity,
    Product:    d.Product,
    // Type:       d['Volume Type'],
    Volume:     volume
  };
}

function fixFIPS(d) {
  var abbr = d.State;
  var state = statesByAbbr[abbr];
  if (!state) {
    // console.warn('Unknown state abbreviation: "' + abbr + '"');
    return false;
  }
  var fips = d.FIPS.substr(0, 2);
  if (state.FIPS !== fips) {
    console.warn('fixing %s state FIPS prefix: %s -> %s',
      abbr, fips, state.FIPS);
    d.FIPS = state.FIPS + d.FIPS.substr(2);
    return true;
  }
  return false;
}

function loadStates(done) {
  util.readData(options['in-states'],
    tito.createReadStream('csv'),
    function(error, states) {
      if (error) return done(error);
      statesByAbbr = util.map(states, 'abbr', true);
      done();
    });
}

function isWithheld(d) {
  return d[volumeField].trim() === 'W';
}

function noop(done) {
  done();
}
