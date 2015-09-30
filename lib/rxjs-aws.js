;(function (root, factory) {
  var objectTypes = {
    'function': true,
    'object': true
  };

  var root = (objectTypes[typeof window] && window) || this,
    freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
    freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
    moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
    freeGlobal = objectTypes[typeof global] && global;
  
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    console.log("freeGlobal");
    root = freeGlobal;
  }

  // Because of build optimizers
  if (typeof define === 'function' && define.amd) {
    define(['rxjs-plus', 'exports'], function (Rx, exports) {
      return root.RxPlus;
    });
  } else if (typeof module == 'object' && module && module.exports == freeExports) {
    module.exports = factory(root, module.exports, root.RxPlus || require('rxjs-plus'));
  } else {
    root.RxPlus = factory(root, {}, root.RxPlus);
  }
}(this, function (global, exp, rx, undefined) {
    //rx = require('rxjs-plus');
    //var rx = require('rxjs-plus');
    var aws = this._aws = require('aws-sdk');
    var _ = require('lodash');

    // Aliases
    var rxo = rx.Observable,
        rxn = rx.Observable.fromNodeCallback,
        rxed = rx.Observable.from;

    var ObservableProto = rxo.prototype;

    function wrapAPI(Constr, params, target) {
        var x = (params instanceof Constr) ? params : new Constr(params);
        _.forIn(x, function(val, key) {
            if (typeof val === 'function') {
                var valBound = val.bind(x);
                target[key] = rxn(valBound);
                //console.log(key + ");
            }
        });

        return x;
    }

    // Set Access Key and Secret key from process env
    aws.config.useEnv = function() {
        aws.config.update({
            'accessKey': process.env.AWS_ACCESS_KEY_ID,
            'secretKey': process.env.AWS_SECRET_ACCESS_KEY
        });
        return aws.config;
    };

    // Shorthand for region change
    aws.config.setRegion = function(region) {
        aws.config.update({
            region: region
        });
        return aws.config;
    };

    rxo.aws = 
    rxo.prototype.aws = {
        'config': aws.config,
        'S3': function(params) {
            var wrapper = {};
            this._s3 = wrapAPI(aws.S3, params, wrapper);

            var _listBuckets = wrapper.listBuckets;
            wrapper.listBucketNames = function() {
                return _listBuckets().pluck('Buckets').flatMap(rxo.fromArray).pluck('Name');
            };

            wrapper.getObjectAsString = function(url) {
                var bucket = url.split('/')[0];
                url = url.replace(bucket+'/', '');
                var obj = { Bucket: bucket, 
                            Key:  url };
                return wrapper.getObject(obj).pluck('Body')
                        .mapToString();
            };

            ObservableProto.putObjectAsString = 
            wrapper.putObjectAsString = function(url, acl) {
                return function(data) {
                    var bucket = url.split('/')[0];
                    url = url.replace(bucket+'/', '');
                    var obj = { Bucket: bucket, 
                                Key:  url };
                    obj.Body = data;
                    if(acl) obj.ACL = acl;
                    return wrapper.putObject(obj);
                }

            };

            return wrapper;
        },
        'Lambda': function(params) {
            var wrapper = {};
            var _lambda =
                this._lambda = wrapAPI(aws.Lambda, params, wrapper);

            var _listFunctions = wrapper.listFunctions;
            wrapper.listFunctions = function() {
                return _listFunctions().pluck('Functions').flatMap(rxo.fromArray);
            }

            return wrapper;
        },
        'DynamoDB': function(params) {
            var wrapper = {};
            this._dynamodb = wrapAPI(aws.DynamoDB, params, wrapper);

            return wrapper;
        }
    };

    return rx;

}));