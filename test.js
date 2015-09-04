var rxjs = require('./lib/rxjs-aws.js');

var rx = require('rx'),
	_ = require('lodash'),
	rxo = rx.Observable,
	rxn = rxo.fromNodeCallback,
	rxarray = rxo.fromArray;

var fs = require('fs');
var env = require('dotenv').parse(fs.readFileSync(".env"));
//console.log(env);
var aws = new rxjs(
	{ 'accessKey': env.AWS_ACCESS_KEY_ID,
	  'secretKey': env.AWS_SECRET_ACCESS_KEY
	}
);
aws.config.setRegion('us-west-2');
//console.log(aws.Lambda);
var lambda = new aws.Lambda();

lambda.listFunctionsFlat().pluck('FunctionName').subscribe(console.log);
