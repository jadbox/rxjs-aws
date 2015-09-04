var rx = require('rx'),
	_ = require('lodash'),
	rxo = rx.Observable,
	rxn = rxo.fromNodeCallback;

function awsrx(config) {
	var _awsrx = this;
	config = config || {};
	if(!this.aws) {
 		this.aws = require('aws-sdk');
	}
	this.aws.config.update({
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey
    });

	this.S3 = function(params) {
		this.S3 = new _awsrx.aws.S3(params);
		var _S3 = this;

	    _.forIn(this.S3, function(val, key) {
	    	if(typeof val === 'function') {
	    		var valBound = val.bind(_S3.S3);
	    		_S3[key] = rxn( valBound );
	    		//console.log(key + ",");
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
	};
}

awsrx.prototype.config = {
	update: function (params) {
		_aws.config.update(params);
	},
	setRegion: function(region) {
		_aws.config.update({ region: region } )
	}
}

module.exports = awsrx;
