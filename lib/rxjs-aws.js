;(function (factory) {
  var objectTypes = {
    'function': true,
    'object': true
  };

  var
    freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
    freeSelf = objectTypes[typeof self] && self.Object && self,
    freeWindow = objectTypes[typeof window] && window && window.Object && window,
    freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
    moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
    freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;

  var root = root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;

  // Because of build optimizers
  if (typeof define === 'function' && define.amd) {
    define(['rx-plus', 'exports'], function (Rx, exports) {
      root.Rx = factory(root, exports, Rx);
      return root.Rx;
    });
  } else if (typeof module === 'object' && module && module.exports === freeExports) {
    module.exports = factory(root, module.exports, 
    	root.Rx?root.Rx:require('rxjs-plus'));
  } else {
    root.Rx = factory(root, {}, root.Rx);
  }
}.call(this, function (root, exp, rx, undefined) {
	var aws = this._aws = require('aws-sdk');
	var _ = require('lodash');
  	// Aliases
  	//console.log(rx);
	var rxo = rx.Observable,
	rxn = rx.Observable.fromNodeCallback, 
	rxed = rx.Observable.from;

	var Observable = rx.Observable;
	var observableProto = Observable.prototype;

	function wrapAPI(Constr, params, target) {
		var x = (params instanceof Constr) ? params : new Constr(params);
		_.forIn(x, function(val, key) {
		    if(typeof val === 'function') {
		    	var valBound = val.bind(x);
		    	target[key] = rxn( valBound );
		    		//console.log(key + ");
		    }
		});

		return x;
	}

	// Set Access Key and Secret key from process env
	aws.config.useEnv = function() {
		aws.config.update( 
			{ 'accessKey': process.env.AWS_ACCESS_KEY_ID,
			  'secretKey': process.env.AWS_SECRET_ACCESS_KEY
			} );
		return aws.config;
	};

	// Shorthand for region change
	aws.config.setRegion = function(region) {
		aws.config.update( { region: region } );
		return aws.config;
	};

	observableProto.aws = {
		'config': aws.config,
		'S3': function(params) {
			var wrapper = {};
			this._s3 = wrapAPI(aws.S3, params, wrapper);

			return wrapper;
		},
		'Lambda': function(params) {
			var wrapper = {};
			var _lambda = 
				this._lambda = wrapAPI(aws.Lambda, params, wrapper);
			wrapper.listFunctions = function() {
				return wrapper.listFunctions().pluck('Functions').flatMap(rxo.fromArray);
			}

			return wrapper;
		},
		'DynamoDB': function(params) {
			var wrapper = {};
			this._dynamodb = wrapAPI(aws.DynamoDB, params, wrapper);

			return wrapper;
		}
	};

	return observableProto.aws;
}));

/*
var rx = global.Rx ? global.Rx : require('rx'),
	_ = require('lodash'),
	rxo = rx.Observable,
	ObservableProto = rxo.prototype,
	rxn = rxo.fromNodeCallback;

function awsrx(config) {
	var _awsrx = this;
	config = config || {};
	var aws = this.aws = require('aws-sdk');

	aws.config.update({
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey
    });
    this.config = aws.config;

	this.S3 = function(params) {
		this.S3 = new aws.S3(params);
		var _S3 = this;

	    _.forIn(this.S3, function(val, key) {
	    	if(typeof val === 'function') {
	    		var valBound = val.bind(_S3.S3);
	    		_S3[key] = rxn( valBound );
	    		//console.log(key + ");
	    	}
	    });
	};

	this.Lambda = function(params) {
		params = params || {
        	apiVersion: '2015-03-31'
     	};
	    this.lambda = new _awsrx.aws.Lambda(params);
	    var _Lambda = this;

	    _.forIn(this.lambda, function(val, key) {
	    	if(typeof val === 'function') {
	    		var valBound = val.bind(_Lambda.lambda);
	    		_Lambda[key] = rxn( valBound );
	    		//console.log(key + ",");
	    	}
	    });

	    _Lambda.listFunctionsFlat = function() {
	    	return _Lambda.listFunctions()
	    		.pluck('Functions').flatMap(rxo.fromArray);
	    };

	    _Lambda.upsertFunction = function() {
	    	
	    };
	};

	this.config.setRegion = function(region) {
			aws.config.update( { region: region } );
	};

	this.config.useEnv = function() {
		aws.config.update( 
			{ 'accessKey': process.env.AWS_ACCESS_KEY_ID,
			  'secretKey': process.env.AWS_SECRET_ACCESS_KEY
			} );
	};
}

ObservableProto.aws = {};

module.exports = awsrx;
*/