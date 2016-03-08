(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var rx = global.Rx || __webpack_require__(1);
	//var rx = require('rxjs-plus');
	var aws = __webpack_require__(2);
	var _ = __webpack_require__(3);
	var RxNode = __webpack_require__(4);
	
	// Aliases
	var rxo = rx.Observable,
	    rxn = rx.Observable.fromNodeCallback,
	    rxed = rx.Observable.from;
	
	var ObservableProto = rxo.prototype;
	
	function wrapAPI(Constr, params, target) {
	    var x = params instanceof Constr ? params : new Constr(params);
	    _.forIn(x, function (val, key) {
	        if (typeof val === 'function') {
	            //var valBound = val.bind(x);
	            target[key] = rxn(val, x);
	            //console.log(key + ");
	        }
	    });
	
	    return x;
	}
	
	// Set Access Key and Secret key from process env
	aws.config.useEnv = function () {
	    aws.config.update({
	        'accessKey': process.env.AWS_ACCESS_KEY_ID,
	        'secretKey': process.env.AWS_SECRET_ACCESS_KEY
	    });
	    return aws.config;
	};
	
	// Shorthand for region change
	aws.config.setRegion = function (region) {
	    aws.config.update({
	        region: region
	    });
	    return aws.config;
	};
	
	rxo.aws = rxo.prototype.aws = {
	    '_': aws,
	    'config': aws.config,
	    'debug': false,
	    'S3': function S3(params) {
	        var wrapper = {};
	        this._s3 = wrapAPI(aws.S3, params, wrapper);
	        var _s3 = this._s3;
	
	        var _listBuckets = wrapper.listBuckets;
	
	        wrapper.listBucketNames = function listBucketNamesMethod() {
	            return _listBuckets().pluck('Buckets').flatMap(rxo.fromArray).pluck('Name');
	        };
	
	        wrapper.listObjects$ = function (params) {
	            if (!params.marker) {
	                //params.marker = 0;
	            }
	            return rxo.defer(function () {
	                return wrapper.listObjects(params);
	            }).flatMap(function (x) {
	                var justx = rxo.just(x);
	                if (x.IsTruncated && x.NextMarker) {
	                    params.Marker = x.NextMarker;
	                    return justx.merge(wrapper.listObjects$(params));
	                } else if (x.IsTruncated && !x.NextMarker) {
	                    var length = x.Contents.length;
	                    var Key = x.Contents[length - 1].Key;
	                    params.Marker = Key;
	                    return justx.merge(wrapper.listObjects$(params));
	                } else return justx;
	            });
	        };
	
	        wrapper.deleteObject$ = function (url) {
	            if (url.indexOf('/') === -1) throw new Error('missing bucket name');
	            var bucket = url.split('/')[0];
	            url = url.replace(bucket + '/', '');
	            if (rxo.aws.debug) console.log("Delete from s3", "bucket: " + bucket, "key: " + url);
	            var obj = {
	                Bucket: bucket,
	                Key: url
	            };
	            return wrapper.deleteObject(obj);
	        };
	
	        wrapper.getObjectStream = function getObjectAsStream(url, range, pipe) {
	            if (url.indexOf('/') === -1) throw new Error('missing bucket name');
	            var bucket = url.split('/')[0];
	            url = url.replace(bucket + '/', '');
	
	            var obj = {
	                Bucket: bucket,
	                Key: url
	            };
	            if (range) {
	                if (range.length < 2 || range[1] === -1) obj.Range = 'bytes=' + range[0] + '-';else obj.Range = 'bytes=' + range[0] + '-' + range[1];
	            }
	            if (rxo.aws.debug) console.log("Streaming from s3", "bucket: " + bucket, "key: " + url);
	
	            var stream = pipe ? _s3.getObject(obj).createReadStream().pipe(pipe) : _s3.getObject(obj).createReadStream();
	
	            return RxNode.fromReadableStream(stream);
	            //.pluck('Body')
	        };
	
	        wrapper.getObjectAsString = function getObjectAsStringMethod(url) {
	            if (url.indexOf('/') === -1) throw new Error('missing bucket name');
	            var bucket = url.split('/')[0];
	            url = url.replace(bucket + '/', '');
	            var milliseconds;
	
	            var obj = {
	                Bucket: bucket,
	                Key: url
	            };
	            return rxo.defer(function () {
	                milliseconds = new Date().getTime();
	                return wrapper.getObject(obj);
	            })
	            //.retry(3)
	            .do(function (x) {
	                var finised_milliseconds = new Date().getTime() - milliseconds;
	                if (rxo.aws.debug) console.log("Fetched from s3", "bucket: " + bucket, "key: " + url + ' time: ' + finised_milliseconds);
	            }).pluck('Body').map(function (x) {
	                return x.toString();
	            });
	        };
	
	        // Todo: defer here as well?
	        ObservableProto.putObjectAsString = wrapper.putObjectAsString = function (url, acl) {
	            return function (data) {
	                var bucket = url.split('/')[0];
	                url = url.replace(bucket + '/', '');
	                var obj = {
	                    Bucket: bucket,
	                    Key: url
	                };
	                obj.Body = data;
	                if (acl) obj.ACL = acl;
	                var milliseconds = new Date().getTime();
	                return wrapper.putObject(obj).do(function (x) {
	                    var finised_milliseconds = new Date().getTime() - milliseconds;
	                    if (rxo.aws.debug) console.log("Saved to s3", "bucket: " + bucket, "key: " + url + ' time: ' + finised_milliseconds);
	                });
	            };
	        };
	
	        return wrapper;
	    },
	    'Lambda': function Lambda(params) {
	        var wrapper = {};
	        var _lambda = this._lambda = wrapAPI(aws.Lambda, params, wrapper);
	
	        var _listFunctions = wrapper.listFunctions;
	        wrapper.listFunctions = function () {
	            return _listFunctions().pluck('Functions').flatMap(rxo.fromArray);
	        };
	
	        return wrapper;
	    },
	    'DynamoDB': function DynamoDB(params) {
	        var wrapper = {};
	        this._dynamodb = wrapAPI(aws.DynamoDB, params, wrapper);
	
	        return wrapper;
	    },
	    'SNS': function SNS(params) {
	        var wrapper = {};
	        this._sns = wrapAPI(aws.SNS, params, wrapper);
	
	        return wrapper;
	    },
	    'SQS': function SQS(params) {
	        var wrapper = {};
	        this._sqs = wrapAPI(aws.SQS, params, wrapper);
	
	        return wrapper;
	    }
	};
	
	exports = module.exports = rx;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("rx");

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("aws-sdk");

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("lodash");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("rx-node");

/***/ }
/******/ ])));
//# sourceMappingURL=rxjs-aws.js.map