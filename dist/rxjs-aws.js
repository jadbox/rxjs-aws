(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	eval("'use strict';\n\nvar rx = global.Rx || __webpack_require__(1);\n//var rx = require('rxjs-plus');\nvar aws = __webpack_require__(2);\nvar _ = __webpack_require__(3);\nvar RxNode = __webpack_require__(4);\n\n// Aliases\nvar rxo = rx.Observable,\n    rxn = rx.Observable.fromNodeCallback,\n    rxed = rx.Observable.from;\n\nvar ObservableProto = rxo.prototype;\n\nfunction wrapAPI(Constr, params, target) {\n    var x = params instanceof Constr ? params : new Constr(params);\n    _.forIn(x, function (val, key) {\n        if (typeof val === 'function') {\n            //var valBound = val.bind(x);\n            target[key] = rxn(val, x);\n            //console.log(key + \");\n        }\n    });\n\n    return x;\n}\n\n// Set Access Key and Secret key from process env\naws.config.useEnv = function () {\n    aws.config.update({\n        'accessKey': process.env.AWS_ACCESS_KEY_ID,\n        'secretKey': process.env.AWS_SECRET_ACCESS_KEY\n    });\n    return aws.config;\n};\n\n// Shorthand for region change\naws.config.setRegion = function (region) {\n    aws.config.update({\n        region: region\n    });\n    return aws.config;\n};\n\nrxo.aws = rxo.prototype.aws = {\n    '_': aws,\n    'config': aws.config,\n    'debug': false,\n    'S3': function S3(params) {\n        var wrapper = {};\n        this._s3 = wrapAPI(aws.S3, params, wrapper);\n        var _s3 = this._s3;\n\n        var _listBuckets = wrapper.listBuckets;\n\n        wrapper.listBucketNames = function listBucketNamesMethod() {\n            return _listBuckets().pluck('Buckets').flatMap(rxo.fromArray).pluck('Name');\n        };\n\n        wrapper.listObjects$ = function (params) {\n            if (!params.marker) {\n                //params.marker = 0;\n            }\n            return rxo.defer(function () {\n                return wrapper.listObjects(params);\n            }).flatMap(function (x) {\n                var justx = rxo.just(x);\n                if (x.IsTruncated && x.NextMarker) {\n                    params.Marker = x.NextMarker;\n                    return justx.merge(wrapper.listObjects$(params));\n                } else if (x.IsTruncated && !x.NextMarker) {\n                    var length = x.Contents.length;\n                    var Key = x.Contents[length - 1].Key;\n                    params.Marker = Key;\n                    return justx.merge(wrapper.listObjects$(params));\n                } else return justx;\n            });\n        };\n\n        wrapper.deleteObject$ = function (url) {\n            if (url.indexOf('/') === -1) throw new Error('missing bucket name');\n            var bucket = url.split('/')[0];\n            url = url.replace(bucket + '/', '');\n            if (rxo.aws.debug) console.log(\"Delete from s3\", \"bucket: \" + bucket, \"key: \" + url);\n            var obj = {\n                Bucket: bucket,\n                Key: url\n            };\n            return wrapper.deleteObject(obj);\n        };\n\n        wrapper.getObjectStream = function getObjectAsStream(url, range, pipe) {\n            if (url.indexOf('/') === -1) throw new Error('missing bucket name');\n            var bucket = url.split('/')[0];\n            url = url.replace(bucket + '/', '');\n\n            var obj = {\n                Bucket: bucket,\n                Key: url\n            };\n            if (range) {\n                if (range.length < 2 || range[1] === -1) obj.Range = 'bytes=' + range[0] + '-';else obj.Range = 'bytes=' + range[0] + '-' + range[1];\n            }\n            if (rxo.aws.debug) console.log(\"Streaming from s3\", \"bucket: \" + bucket, \"key: \" + url);\n\n            var stream = pipe ? _s3.getObject(obj).createReadStream().pipe(pipe) : _s3.getObject(obj).createReadStream();\n\n            return RxNode.fromReadableStream(stream);\n            //.pluck('Body')\n        };\n\n        wrapper.getObjectAsString = function getObjectAsStringMethod(url) {\n            if (url.indexOf('/') === -1) throw new Error('missing bucket name');\n            var bucket = url.split('/')[0];\n            url = url.replace(bucket + '/', '');\n            var milliseconds;\n\n            var obj = {\n                Bucket: bucket,\n                Key: url\n            };\n            return rxo.defer(function () {\n                milliseconds = new Date().getTime();\n                return wrapper.getObject(obj);\n            })\n            //.retry(3)\n            .do(function (x) {\n                var finised_milliseconds = new Date().getTime() - milliseconds;\n                if (rxo.aws.debug) console.log(\"Fetched from s3\", \"bucket: \" + bucket, \"key: \" + url + ' time: ' + finised_milliseconds);\n            }).pluck('Body').map(function (x) {\n                return x.toString();\n            });\n        };\n\n        // Todo: defer here as well?\n        ObservableProto.putObjectAsString = wrapper.putObjectAsString = function (url, acl) {\n            return function (data) {\n                var bucket = url.split('/')[0];\n                url = url.replace(bucket + '/', '');\n                var obj = {\n                    Bucket: bucket,\n                    Key: url\n                };\n                obj.Body = data;\n                if (acl) obj.ACL = acl;\n                var milliseconds = new Date().getTime();\n                return wrapper.putObject(obj).do(function (x) {\n                    var finised_milliseconds = new Date().getTime() - milliseconds;\n                    if (rxo.aws.debug) console.log(\"Saved to s3\", \"bucket: \" + bucket, \"key: \" + url + ' time: ' + finised_milliseconds);\n                });\n            };\n        };\n\n        return wrapper;\n    },\n    'Lambda': function Lambda(params) {\n        var wrapper = {};\n        var _lambda = this._lambda = wrapAPI(aws.Lambda, params, wrapper);\n\n        var _listFunctions = wrapper.listFunctions;\n        wrapper.listFunctions = function () {\n            return _listFunctions().pluck('Functions').flatMap(rxo.fromArray);\n        };\n\n        return wrapper;\n    },\n    'DynamoDB': function DynamoDB(params) {\n        var wrapper = {};\n        this._dynamodb = wrapAPI(aws.DynamoDB, params, wrapper);\n\n        return wrapper;\n    },\n    'SNS': function SNS(params) {\n        var wrapper = {};\n        this._sns = wrapAPI(aws.SNS, params, wrapper);\n\n        return wrapper;\n    },\n    'SQS': function SQS(params) {\n        var wrapper = {};\n        this._sqs = wrapAPI(aws.SQS, params, wrapper);\n\n        return wrapper;\n    }\n};\n\nexports = module.exports = rx;\n\n/*****************\n ** WEBPACK FOOTER\n ** ./src/index.js\n ** module id = 0\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///./src/index.js?");

/***/ },
/* 1 */
/***/ function(module, exports) {

	eval("module.exports = require(\"rx\");\n\n/*****************\n ** WEBPACK FOOTER\n ** external \"rx\"\n ** module id = 1\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///external_%22rx%22?");

/***/ },
/* 2 */
/***/ function(module, exports) {

	eval("module.exports = require(\"aws-sdk\");\n\n/*****************\n ** WEBPACK FOOTER\n ** external \"aws-sdk\"\n ** module id = 2\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///external_%22aws-sdk%22?");

/***/ },
/* 3 */
/***/ function(module, exports) {

	eval("module.exports = require(\"lodash\");\n\n/*****************\n ** WEBPACK FOOTER\n ** external \"lodash\"\n ** module id = 3\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///external_%22lodash%22?");

/***/ },
/* 4 */
/***/ function(module, exports) {

	eval("module.exports = require(\"rx-node\");\n\n/*****************\n ** WEBPACK FOOTER\n ** external \"rx-node\"\n ** module id = 4\n ** module chunks = 0\n **/\n//# sourceURL=webpack:///external_%22rx-node%22?");

/***/ }
/******/ ])));