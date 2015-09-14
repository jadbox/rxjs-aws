var rx = require('rxjs-plus');
var aws = this._aws = require('aws-sdk');
var _ = require('lodash');

// Aliases
var rxo = rx.Observable,
    rxn = rx.Observable.fromNodeCallback,
    rxed = rx.Observable.from;

var Observable = rx.Observable;
var ObservableProto = Observable.prototype;

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

ObservableProto.aws = Observable.aws = {
    'config': aws.config,
    'S3': function(params) {
        var wrapper = {};
        this._s3 = wrapAPI(aws.S3, params, wrapper);

        var _listBuckets = wrapper.listBuckets;
        wrapper.listBucketNames = function() {
            return _listBuckets().pluck('Buckets').flatMap(rxo.fromArray).pluck('Name');
        }

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

module.exports = rx;