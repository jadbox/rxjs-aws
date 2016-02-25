require("source-map-support").install();
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

	eval("'use strict';\n\nvar rx = global.Rx || __webpack_require__(1);\n//var rx = require('rxjs-plus');\nvar aws = __webpack_require__(2);\nvar _ = __webpack_require__(3);\nvar RxNode = __webpack_require__(4);\n\n// Aliases\nvar rxo = rx.Observable,\n    rxn = rx.Observable.fromNodeCallback,\n    rxed = rx.Observable.from;\n\nvar ObservableProto = rxo.prototype;\n\nfunction wrapAPI(Constr, params, target) {\n    var x = params instanceof Constr ? params : new Constr(params);\n    _.forIn(x, function (val, key) {\n        if (typeof val === 'function') {\n            //var valBound = val.bind(x);\n            target[key] = rxn(val, x);\n            //console.log(key + \");\n        }\n    });\n\n    return x;\n}\n\n// Set Access Key and Secret key from process env\naws.config.useEnv = function () {\n    aws.config.update({\n        'accessKey': process.env.AWS_ACCESS_KEY_ID,\n        'secretKey': process.env.AWS_SECRET_ACCESS_KEY\n    });\n    return aws.config;\n};\n\n// Shorthand for region change\naws.config.setRegion = function (region) {\n    aws.config.update({\n        region: region\n    });\n    return aws.config;\n};\n\nrxo.aws = rxo.prototype.aws = {\n    '_': aws,\n    'config': aws.config,\n    'debug': false,\n    'S3': function S3(params) {\n        var wrapper = {};\n        this._s3 = wrapAPI(aws.S3, params, wrapper);\n        var _s3 = this._s3;\n\n        var _listBuckets = wrapper.listBuckets;\n\n        wrapper.listBucketNames = function listBucketNamesMethod() {\n            return _listBuckets().pluck('Buckets').flatMap(rxo.fromArray).pluck('Name');\n        };\n\n        wrapper.listObjects$ = function (params) {\n            if (!params.marker) {\n                //params.marker = 0;\n            }\n            return rxo.defer(function () {\n                return wrapper.listObjects(params);\n            }).flatMap(function (x) {\n                var justx = rxo.just(x);\n                if (x.IsTruncated && x.NextMarker) {\n                    params.Marker = x.NextMarker;\n                    return justx.merge(wrapper.listObjects$(params));\n                } else if (x.IsTruncated && !x.NextMarker) {\n                    var length = x.Contents.length;\n                    var Key = x.Contents[length - 1].Key;\n                    params.Marker = Key;\n                    return justx.merge(wrapper.listObjects$(params));\n                } else return justx;\n            });\n        };\n\n        wrapper.deleteObject$ = function (url) {\n            if (url.indexOf('/') === -1) throw new Error('missing bucket name');\n            var bucket = url.split('/')[0];\n            url = url.replace(bucket + '/', '');\n            if (rxo.aws.debug) console.log(\"Delete from s3\", \"bucket: \" + bucket, \"key: \" + url);\n            var obj = {\n                Bucket: bucket,\n                Key: url\n            };\n            return wrapper.deleteObject(obj);\n        };\n\n        wrapper.getObjectStream = function getObjectAsStream(url, range, pipe) {\n            if (url.indexOf('/') === -1) throw new Error('missing bucket name');\n            var bucket = url.split('/')[0];\n            url = url.replace(bucket + '/', '');\n\n            var obj = {\n                Bucket: bucket,\n                Key: url\n            };\n            if (range) {\n                if (range.length < 2 || range[1] === -1) obj.Range = 'bytes=' + range[0] + '-';else obj.Range = 'bytes=' + range[0] + '-' + range[1];\n            }\n            if (rxo.aws.debug) console.log(\"Streaming from s3\", \"bucket: \" + bucket, \"key: \" + url);\n\n            var stream = pipe ? _s3.getObject(obj).createReadStream().pipe(pipe) : _s3.getObject(obj).createReadStream();\n\n            return RxNode.fromReadableStream(stream);\n            //.pluck('Body')\n        };\n\n        wrapper.getObjectAsString = function getObjectAsStringMethod(url) {\n            if (url.indexOf('/') === -1) throw new Error('missing bucket name');\n            var bucket = url.split('/')[0];\n            url = url.replace(bucket + '/', '');\n            var milliseconds;\n\n            var obj = {\n                Bucket: bucket,\n                Key: url\n            };\n            return rxo.defer(function () {\n                milliseconds = new Date().getTime();\n                return wrapper.getObject(obj);\n            })\n            //.retry(3)\n            .do(function (x) {\n                var finised_milliseconds = new Date().getTime() - milliseconds;\n                if (rxo.aws.debug) console.log(\"Fetched from s3\", \"bucket: \" + bucket, \"key: \" + url + ' time: ' + finised_milliseconds);\n            }).pluck('Body').map(function (x) {\n                return x.toString();\n            });\n        };\n\n        // Todo: defer here as well?\n        ObservableProto.putObjectAsString = wrapper.putObjectAsString = function (url, acl) {\n            return function (data) {\n                var bucket = url.split('/')[0];\n                url = url.replace(bucket + '/', '');\n                var obj = {\n                    Bucket: bucket,\n                    Key: url\n                };\n                obj.Body = data;\n                if (acl) obj.ACL = acl;\n                var milliseconds = new Date().getTime();\n                return wrapper.putObject(obj).do(function (x) {\n                    var finised_milliseconds = new Date().getTime() - milliseconds;\n                    if (rxo.aws.debug) console.log(\"Saved to s3\", \"bucket: \" + bucket, \"key: \" + url + ' time: ' + finised_milliseconds);\n                });\n            };\n        };\n\n        return wrapper;\n    },\n    'Lambda': function Lambda(params) {\n        var wrapper = {};\n        var _lambda = this._lambda = wrapAPI(aws.Lambda, params, wrapper);\n\n        var _listFunctions = wrapper.listFunctions;\n        wrapper.listFunctions = function () {\n            return _listFunctions().pluck('Functions').flatMap(rxo.fromArray);\n        };\n\n        return wrapper;\n    },\n    'DynamoDB': function DynamoDB(params) {\n        var wrapper = {};\n        this._dynamodb = wrapAPI(aws.DynamoDB, params, wrapper);\n\n        return wrapper;\n    },\n    'SNS': function SNS(params) {\n        var wrapper = {};\n        this._sns = wrapAPI(aws.SNS, params, wrapper);\n\n        return wrapper;\n    },\n    'SQS': function SQS(params) {\n        var wrapper = {};\n        this._sqs = wrapAPI(aws.SQS, params, wrapper);\n\n        return wrapper;\n    }\n};\n\nexports = module.exports = rx;\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanM/OTU1MiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLElBQU0sS0FBSyxPQUFPLEVBQVAsSUFBYSxvQkFBUSxDQUFSLENBQWI7O0FBRVgsSUFBSSxNQUFNLG9CQUFRLENBQVIsQ0FBTjtBQUNKLElBQUksSUFBSSxvQkFBUSxDQUFSLENBQUo7QUFDSixJQUFJLFNBQVMsb0JBQVEsQ0FBUixDQUFUOzs7QUFHSixJQUFJLE1BQU0sR0FBRyxVQUFIO0lBQ1YsTUFBTSxHQUFHLFVBQUgsQ0FBYyxnQkFBZDtJQUNOLE9BQU8sR0FBRyxVQUFILENBQWMsSUFBZDs7QUFFUCxJQUFJLGtCQUFrQixJQUFJLFNBQUo7O0FBRXRCLFNBQVMsT0FBVCxDQUFpQixNQUFqQixFQUF5QixNQUF6QixFQUFpQyxNQUFqQyxFQUF5QztBQUN4QyxRQUFJLElBQUksTUFBQyxZQUFrQixNQUFsQixHQUE0QixNQUE3QixHQUFzQyxJQUFJLE1BQUosQ0FBVyxNQUFYLENBQXRDLENBRGdDO0FBRXhDLE1BQUUsS0FBRixDQUFRLENBQVIsRUFBVyxVQUFTLEdBQVQsRUFBYyxHQUFkLEVBQW1CO0FBQzFCLFlBQUksT0FBTyxHQUFQLEtBQWUsVUFBZixFQUEyQjs7QUFFM0IsbUJBQU8sR0FBUCxJQUFjLElBQUksR0FBSixFQUFTLENBQVQsQ0FBZDs7QUFGMkIsU0FBL0I7S0FETyxDQUFYLENBRndDOztBQVV6QyxXQUFPLENBQVAsQ0FWeUM7Q0FBekM7OztBQWNBLElBQUksTUFBSixDQUFXLE1BQVgsR0FBb0IsWUFBVztBQUM5QixRQUFJLE1BQUosQ0FBVyxNQUFYLENBQWtCO0FBQ2QscUJBQWEsUUFBUSxHQUFSLENBQVksaUJBQVo7QUFDYixxQkFBYSxRQUFRLEdBQVIsQ0FBWSxxQkFBWjtLQUZqQixFQUQ4QjtBQUs5QixXQUFPLElBQUksTUFBSixDQUx1QjtDQUFYOzs7QUFTcEIsSUFBSSxNQUFKLENBQVcsU0FBWCxHQUF1QixVQUFTLE1B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QUFPLE9BQVAsQ0FKeUI7S0FBakI7QUFNWixXQUFPLGFBQVMsTUFBVCxFQUFpQjtBQUNwQixZQUFJLFVBQVUsRUFBVixDQURnQjtBQUVwQixhQUFLLElBQUwsR0FBWSxRQUFRLElBQUksR0FBSixFQUFTLE1BQWpCLEVBQXlCLE9BQXpCLENBQVosQ0FGb0I7O0FBSXBCLGVBQU8sT0FBUCxDQUpvQjtLQUFqQjtBQU1QLFdBQU8sYUFBUyxNQUFULEVBQWlCO0FBQ3BCLFlBQUksVUFBVSxFQUFWLENBRGdCO0FBRXBCLGFBQUssSUFBTCxHQUFZLFFBQVEsSUFBSSxHQUFKLEVBQVMsTUFBakIsRUFBeUIsT0FBekIsQ0FBWixDQUZvQjs7QUFJcEIsZUFBTyxPQUFQLENBSm9CO0tBQWpCO0NBN0lYOztBQXFKQSxVQUFVLE9BQU8sT0FBUCxHQUFpQixFQUFqQiIsImZpbGUiOiIwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5jb25zdCByeCA9IGdsb2JhbC5SeCB8fCByZXF1aXJlKCdyeCcpO1xuLy92YXIgcnggPSByZXF1aXJlKCdyeGpzLXBsdXMnKTtcbnZhciBhd3MgPSByZXF1aXJlKCdhd3Mtc2RrJyk7XG52YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIFJ4Tm9kZSA9IHJlcXVpcmUoJ3J4LW5vZGUnKTtcblxuLy8gQWxpYXNlc1xudmFyIHJ4byA9IHJ4Lk9ic2VydmFibGUsXG5yeG4gPSByeC5PYnNlcnZhYmxlLmZyb21Ob2RlQ2FsbGJhY2ssXG5yeGVkID0gcnguT2JzZXJ2YWJsZS5mcm9tO1xuXG52YXIgT2JzZXJ2YWJsZVByb3RvID0gcnhvLnByb3RvdHlwZTtcblxuZnVuY3Rpb24gd3JhcEFQSShDb25zdHIsIHBhcmFtcywgdGFyZ2V0KSB7XG5cdHZhciB4ID0gKHBhcmFtcyBpbnN0YW5jZW9mIENvbnN0cikgPyBwYXJhbXMgOiBuZXcgQ29uc3RyKHBhcmFtcyk7XG5cdF8uZm9ySW4oeCwgZnVuY3Rpb24odmFsLCBrZXkpIHtcblx0ICAgIGlmICh0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgICAgLy92YXIgdmFsQm91bmQgPSB2YWwuYmluZCh4KTtcblx0ICAgICAgICB0YXJnZXRba2V5XSA9IHJ4bih2YWwsIHgpO1xuXHQgICAgICAgIC8vY29uc29sZS5sb2coa2V5ICsgXCIpO1xuICAgIH1cbn0pO1xuXG5yZXR1cm4geDtcbn1cblxuLy8gU2V0IEFjY2VzcyBLZXkgYW5kIFNlY3JldCBrZXkgZnJvbSBwcm9jZXNzIGVudlxuYXdzLmNvbmZpZy51c2VFbnYgPSBmdW5jdGlvbigpIHtcblx0YXdzLmNvbmZpZy51cGRhdGUoe1xuXHQgICAgJ2FjY2Vzc0tleSc6IHByb2Nlc3MuZW52LkFXU19BQ0NFU1NfS0VZX0lELFxuXHQgICAgJ3NlY3JldEtleSc6IHByb2Nlc3MuZW52LkFXU19TRUNSRVRfQUNDRVNTX0tFWVxuXHR9KTtcblx0cmV0dXJuIGF3cy5jb25maWc7XG59O1xuXG4vLyBTaG9ydGhhbmQgZm9yIHJlZ2lvbiBjaGFuZ2VcbmF3cy5jb25maWcuc2V0UmVnaW9uID0gZnVuY3Rpb24ocmVnaW9uKSB7XG5cdGF3cy5jb25maWcudXBkYXRlKHtcblx0ICAgIHJlZ2lvbjogcmVnaW9uXG5cdH0pO1xuXHRyZXR1cm4gYXdzLmNvbmZpZztcbn07XG5cbnJ4by5hd3MgPVxucnhvLnByb3RvdHlwZS5hd3MgPSB7XG4gICAgJ18nOiBhd3MsXG4gICAgJ2NvbmZpZyc6IGF3cy5jb25maWcsXG4gICAgJ2RlYnVnJzogZmFsc2UsXG4gICAgJ1MzJzogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgIHZhciB3cmFwcGVyID0ge307XG4gICAgICAgIHRoaXMuX3MzID0gd3JhcEFQSShhd3MuUzMsIHBhcmFtcywgd3JhcHBlcik7XG4gICAgICAgIHZhciBfczMgPSB0aGlzLl9zMztcblxuICAgICAgICB2YXIgX2xpc3RCdWNrZXRzID0gd3JhcHBlci5saXN0QnVja2V0cztcblxuICAgICAgICB3cmFwcGVyLmxpc3RCdWNrZXROYW1lcyA9IGZ1bmN0aW9uIGxpc3RCdWNrZXROYW1lc01ldGhvZCgpIHtcbiAgICAgICAgICAgIHJldHVybiBfbGlzdEJ1Y2tldHMoKS5wbHVjaygnQnVja2V0cycpLmZsYXRNYXAocnhvLmZyb21BcnJheSkucGx1Y2soJ05hbWUnKTtcbiAgICAgICAgfTtcblxuICAgICAgICB3cmFwcGVyLmxpc3RPYmplY3RzJCA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICBcdGlmKCFwYXJhbXMubWFya2VyKSB7XG4gICAgICAgIFx0XHQvL3BhcmFtcy5tYXJrZXIgPSAwO1xuICAgICAgICBcdH1cbiAgICAgICAgICAgIHJldHVybiByeG8uZGVmZXIoKCkgPT4gd3JhcHBlci5saXN0T2JqZWN0cyhwYXJhbXMpKVxuICAgICAgICAgICAgXHRcdC5mbGF0TWFwKCB4ID0+IHtcbiAgICAgICAgICAgIFx0XHRcdGNvbnN0IGp1c3R4ID0gcnhvLmp1c3QoeCk7XG4gICAgICAgICAgICBcdFx0XHRpZih4LklzVHJ1bmNhdGVkICYmIHguTmV4dE1hcmtlcikge1xuICAgICAgICAgICAgXHRcdFx0XHRwYXJhbXMuTWFya2VyID0geC5OZXh0TWFya2VyO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4ganVzdHgubWVyZ2UoIHdyYXBwZXIubGlzdE9iamVjdHMkKHBhcmFtcykgKTtcbiAgICAgICAgICAgIFx0XHRcdH1cbiAgICAgICAgICAgIFx0XHRcdGVsc2UgaWYoeC5Jc1RydW5jYXRlZCAmJiAheC5OZXh0TWFya2VyKSB7XG4gICAgICAgICAgICBcdFx0XHRcdGNvbnN0IGxlbmd0aCA9IHguQ29udGVudHMubGVuZ3RoO1xuICAgICAgICAgICAgXHRcdFx0XHRjb25zdCBLZXkgPSB4LkNvbnRlbnRzW2xlbmd0aC0xXS5LZXk7XG4gICAgICAgICAgICBcdFx0XHRcdHBhcmFtcy5NYXJrZXIgPSBLZXk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBqdXN0eC5tZXJnZSggd3JhcHBlci5saXN0T2JqZWN0cyQocGFyYW1zKSApO1xuICAgICAgICAgICAgXHRcdFx0fVxuICAgICAgICAgICAgXHRcdFx0ZWxzZSByZXR1cm4ganVzdHg7XG4gICAgICAgICAgICBcdFx0fSlcbiAgICAgICAgfVxuXG4gICAgICAgIHdyYXBwZXIuZGVsZXRlT2JqZWN0JCA9IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICAgICAgaWYodXJsLmluZGV4T2YoJy8nKSA9PT0gLTEpIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBidWNrZXQgbmFtZScpO1xuICAgICAgICAgICAgdmFyIGJ1Y2tldCA9IHVybC5zcGxpdCgnLycpWzBdO1xuICAgICAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoYnVja2V0ICsgJy8nLCAnJyk7XG4gICAgICAgICAgICBpZihyeG8uYXdzLmRlYnVnKSBjb25zb2xlLmxvZyhcIkRlbGV0ZSBmcm9tIHMzXCIsIFwiYnVja2V0OiBcIiArIGJ1Y2tldCwgXCJrZXk6IFwiICsgdXJsKTtcbiAgICAgICAgICAgIHZhciBvYmogPSB7XG4gICAgICAgICAgICAgICAgQnVja2V0OiBidWNrZXQsXG4gICAgICAgICAgICAgICAgS2V5OiB1cmxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gd3JhcHBlci5kZWxldGVPYmplY3Qob2JqKTtcbiAgICAgICAgfTtcblxuICAgICAgICB3cmFwcGVyLmdldE9iamVjdFN0cmVhbSA9IGZ1bmN0aW9uIGdldE9iamVjdEFzU3RyZWFtKHVybCwgcmFuZ2UsIHBpcGUpIHtcbiAgICAgICAgICAgIGlmKHVybC5pbmRleE9mKCcvJykgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgYnVja2V0IG5hbWUnKTtcbiAgICAgICAgICAgIHZhciBidWNrZXQgPSB1cmwuc3BsaXQoJy8nKVswXTtcbiAgICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKGJ1Y2tldCArICcvJywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgb2JqID0ge1xuICAgICAgICAgICAgICAgIEJ1Y2tldDogYnVja2V0LFxuICAgICAgICAgICAgICAgIEtleTogdXJsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYocmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBpZihyYW5nZS5sZW5ndGggPCAyIHx8IHJhbmdlWzFdID09PSAtMSkgb2JqLlJhbmdlID0gJ2J5dGVzPScrcmFuZ2VbMF0rJy0nO1xuICAgICAgICAgICAgICAgIGVsc2Ugb2JqLlJhbmdlID0gJ2J5dGVzPScrcmFuZ2VbMF0rJy0nK3JhbmdlWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYocnhvLmF3cy5kZWJ1ZykgY29uc29sZS5sb2coXCJTdHJlYW1pbmcgZnJvbSBzM1wiLCBcImJ1Y2tldDogXCIgKyBidWNrZXQsIFwia2V5OiBcIiArIHVybCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBzdHJlYW0gPSAgcGlwZSA/IF9zMy5nZXRPYmplY3Qob2JqKS5jcmVhdGVSZWFkU3RyZWFtKCkucGlwZShwaXBlKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBfczMuZ2V0T2JqZWN0KG9iaikuY3JlYXRlUmVhZFN0cmVhbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gUnhOb2RlLmZyb21SZWFkYWJsZVN0cmVhbShzdHJlYW0pXG4gICAgICAgICAgICAgICAgLy8ucGx1Y2soJ0JvZHknKVxuICAgICAgICB9O1xuXG4gICAgICAgIHdyYXBwZXIuZ2V0T2JqZWN0QXNTdHJpbmcgPSBmdW5jdGlvbiBnZXRPYmplY3RBc1N0cmluZ01ldGhvZCh1cmwpIHtcbiAgICAgICAgICAgIGlmKHVybC5pbmRleE9mKCcvJykgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgYnVja2V0IG5hbWUnKTtcbiAgICAgICAgICAgIHZhciBidWNrZXQgPSB1cmwuc3BsaXQoJy8nKVswXTtcbiAgICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKGJ1Y2tldCArICcvJywgJycpO1xuICAgICAgICAgICAgdmFyIG1pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG9iaiA9IHtcbiAgICAgICAgICAgICAgICBCdWNrZXQ6IGJ1Y2tldCxcbiAgICAgICAgICAgICAgICBLZXk6IHVybFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiByeG8uZGVmZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gd3JhcHBlci5nZXRPYmplY3Qob2JqKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8ucmV0cnkoMylcbiAgICAgICAgICAgICAgICAuZG8oZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZmluaXNlZF9taWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKSAtIG1pbGxpc2Vjb25kcztcbiAgICAgICAgICAgICAgICAgICAgaWYocnhvLmF3cy5kZWJ1ZykgY29uc29sZS5sb2coXCJGZXRjaGVkIGZyb20gczNcIiwgXCJidWNrZXQ6IFwiICsgYnVja2V0LCBcImtleTogXCIgKyB1cmwgKyAnIHRpbWU6ICcgKyBmaW5pc2VkX21pbGxpc2Vjb25kcyk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGx1Y2soJ0JvZHknKVxuICAgICAgICAgICAgICAgIC5tYXAoeD0+eC50b1N0cmluZygpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUb2RvOiBkZWZlciBoZXJlIGFzIHdlbGw/XG4gICAgICAgIE9ic2VydmFibGVQcm90by5wdXRPYmplY3RBc1N0cmluZyA9XG4gICAgICAgICAgICB3cmFwcGVyLnB1dE9iamVjdEFzU3RyaW5nID0gZnVuY3Rpb24odXJsLCBhY2wpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYnVja2V0ID0gdXJsLnNwbGl0KCcvJylbMF07XG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHVybC5yZXBsYWNlKGJ1Y2tldCArICcvJywgJycpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgQnVja2V0OiBidWNrZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBLZXk6IHVybFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBvYmouQm9keSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2wpIG9iai5BQ0wgPSBhY2w7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdyYXBwZXIucHV0T2JqZWN0KG9iailcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kbyhmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbmlzZWRfbWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKCkgLSBtaWxsaXNlY29uZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocnhvLmF3cy5kZWJ1ZykgY29uc29sZS5sb2coXCJTYXZlZCB0byBzM1wiLCBcImJ1Y2tldDogXCIgKyBidWNrZXQsIFwia2V5OiBcIiArIHVybCArICcgdGltZTogJyArIGZpbmlzZWRfbWlsbGlzZWNvbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuICAgICdMYW1iZGEnOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgdmFyIHdyYXBwZXIgPSB7fTtcbiAgICAgICAgdmFyIF9sYW1iZGEgPVxuICAgICAgICAgICAgdGhpcy5fbGFtYmRhID0gd3JhcEFQSShhd3MuTGFtYmRhLCBwYXJhbXMsIHdyYXBwZXIpO1xuXG4gICAgICAgIHZhciBfbGlzdEZ1bmN0aW9ucyA9IHdyYXBwZXIubGlzdEZ1bmN0aW9ucztcbiAgICAgICAgd3JhcHBlci5saXN0RnVuY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gX2xpc3RGdW5jdGlvbnMoKS5wbHVjaygnRnVuY3Rpb25zJykuZmxhdE1hcChyeG8uZnJvbUFycmF5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4gICAgJ0R5bmFtb0RCJzogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgIHZhciB3cmFwcGVyID0ge307XG4gICAgICAgIHRoaXMuX2R5bmFtb2RiID0gd3JhcEFQSShhd3MuRHluYW1vREIsIHBhcmFtcywgd3JhcHBlcik7XG5cbiAgICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgfSxcbiAgICAnU05TJzogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgIHZhciB3cmFwcGVyID0ge307XG4gICAgICAgIHRoaXMuX3NucyA9IHdyYXBBUEkoYXdzLlNOUywgcGFyYW1zLCB3cmFwcGVyKTtcblxuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuICAgICdTUVMnOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgdmFyIHdyYXBwZXIgPSB7fTtcbiAgICAgICAgdGhpcy5fc3FzID0gd3JhcEFQSShhd3MuU1FTLCBwYXJhbXMsIHdyYXBwZXIpO1xuXG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH1cbn07XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJ4O1xuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zcmMvaW5kZXguanNcbiAqKi8iXSwic291cmNlUm9vdCI6IiJ9");

/***/ },
/* 1 */
/***/ function(module, exports) {

	eval("module.exports = require(\"rx\");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJyeFwiPzYxMTciXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEiLCJmaWxlIjoiMS5qcyIsInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInJ4XCIpO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogZXh0ZXJuYWwgXCJyeFwiXG4gKiogbW9kdWxlIGlkID0gMVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==");

/***/ },
/* 2 */
/***/ function(module, exports) {

	eval("module.exports = require(\"aws-sdk\");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJhd3Mtc2RrXCI/NjRlMyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSIsImZpbGUiOiIyLmpzIiwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiYXdzLXNka1wiKTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIFwiYXdzLXNka1wiXG4gKiogbW9kdWxlIGlkID0gMlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==");

/***/ },
/* 3 */
/***/ function(module, exports) {

	eval("module.exports = require(\"lodash\");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJsb2Rhc2hcIj8wYzhiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIiwiZmlsZSI6IjMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiBleHRlcm5hbCBcImxvZGFzaFwiXG4gKiogbW9kdWxlIGlkID0gM1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==");

/***/ },
/* 4 */
/***/ function(module, exports) {

	eval("module.exports = require(\"rx-node\");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJyeC1ub2RlXCI/YTVhOCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSIsImZpbGUiOiI0LmpzIiwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicngtbm9kZVwiKTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIFwicngtbm9kZVwiXG4gKiogbW9kdWxlIGlkID0gNFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==");

/***/ }
/******/ ])));