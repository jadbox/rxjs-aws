var rx = require('rxjs-plus'), 
	rxo = rx.Observable,
	_ = require('lodash-fp'),
	rxn = rx.Observable.fromNodeCallback;
var fs = require('fs');
//console.log("global.Rx", global.Rx);
var env = require('dotenv').config({silent: true});

require('./lib/rxjs-aws.js');

//console.log("rxo.aws", rxo.aws);
var aws = rxo.aws;

aws.config.useEnv().setRegion('us-west-2');
//console.log(aws.Lambda);
//console.log("rxo aws", rxo.aws);
var lambda = new aws.Lambda();

//var x = _.filter({'name': 'joe'}, [{'name':'joe', active:false}, {'name':'bob', active:false}]);
//console.log(x);
//lambda.listFunctions.pluck('FunctionName').filterIncludes('Pi').subscribe(console.log);
lambda.listFunctions().propertyIncludes('FunctionName', 'LambdaPi').subscribe(console.log);
