var rx = require('rxjs/Rx'),
	AWS = require('./dist/rxjs-aws.js')
	rxo = rx.Observable,
	_ = require('lodash');
var fs = require('fs');
//console.log("global.Rx", global.Rx);
var env = require('dotenv').config({silent: true});

//require('./lib/rxjs-aws.js');

//console.log("rxo.aws", rxo.aws);

//aws.config.useEnv().setRegion('us-west-2');
//console.log(aws.Lambda);
//console.log("rxo aws", rxo.aws);
var aws = new AWS.default();
var s3 = new aws.S3();
s3.listBucketNames().subscribe(function(x){
	console.log(x);
	s3.getObjectAsString('vast-server-tracking-west-2/v1/2016/02/26/01/vast-server-2-2016-02-26-01-13-02-062d4886-0342-40dc-ad01-907e4cf8bd2c')
	.subscribe(x=>{
		console.log('s3', x);
	})
})
//var lambda = new aws.Lambda();

//var x = _.filter({'name': 'joe'}, [{'name':'joe', active:false}, {'name':'bob', active:false}]);
//console.log(x);
//lambda.listFunctions.pluck('FunctionName').filterIncludes('Pi').subscribe(console.log);
//lambda.listFunctions().propertyIncludes('FunctionName', 'Lambda').subscribe(console.log);
