var rxjs = require('./lib/rxjs-aws.js');

var lambda = new rxjs.Lambda();

lambda.getFunction('test').subscribe(console.log);
