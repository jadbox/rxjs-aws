var rx = require('rx'),
	rxo = rx.Observable,
	rxn = rxo.fromNodeCallback, rxed = rxo.from;
require('rxjs-plus');
var fs = require('fs');
var _ = require('lodash-fp');
var __ = require('lodash-fp');
var pr = require('predicate');

var Benchmark = require('benchmark');

//console.log(_.includes("13", "1"));
//console.log(_.partialRight(_.includes, "1")("13"));
///var d = _.ary(_.partialRight(_.includes, "1"), 1);
//var d = _.partial(_.includes, "1", _);
//console.log(d("13", 2, ["1","2","13"]));
function contains (val) {
  return function (arr) {
  	return !!~arr.indexOf(val);
  };
}

 //rxed(["1","2","13"]).filter(contains("1")).subscribe( function(e) {} );

 // __(["1","2","13"]).filter(__.includes("1")).subscribe( function(e) {} );
 //rxed(["1","2","13","1","2","13","1","2","13"]).filter(pr.contains("1")).subscribe( console.log );

 rxed(["1","2","13","1","2","13","1","2","13"]).filterIncludes("1").map(function(d){return d + "test"}).subscribe( function(e) {} );
return

var suite = new Benchmark.Suite;
 
// add tests 
suite.add('lodash', function() {
  rxed(["1","2","13","1","2","13","1","2","13"]).filter(_.includes("1")).map(function(d){return d + "test"}).subscribe( function(e) {} );
})
suite.add('pure', function() {
  rxed(["1","2","13","1","2","13","1","2","13"]).filter(contains("1")).map(function(d){return d + "test"}).subscribe( function(e) {} );
})
suite.add('predicate', function() {
  rxed(["1","2","13","1","2","13","1","2","13"]).filter(pr.contains("1")).map(function(d){return d + "test"}).subscribe( function(e) {} );
})
suite.add('rxjs-plus', function() {
  rxed(["1","2","13","1","2","13","1","2","13"]).filterContains("1").map(function(d){return d + "test"}).subscribe( function(e) {} );
})
// add listeners 
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async 
.run({ 'async': false });
