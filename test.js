var rx = require('rx'),
	_ = require('lodash'),
	rxo = rx.Observable,
	rxn = rxo.fromNodeCallback,
	rxarray = rxo.fromArray;
var fs = require('fs');

var env = require('dotenv').config({silent: true});
var aws = new (require('./lib/rxjs-aws.js'))();

aws.config.useEnv();
aws.config.setRegion('us-west-2');
//console.log(aws.Lambda);
var lambda = new aws.Lambda();

lambda.listFunctionsFlat().pluck('FunctionName').subscribe(console.log);
