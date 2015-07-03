'use strict';
var _ = require('lodash');
var MockData = require('./mock-data');
var ApiRouter = require('./router');
var spec = require('swagger-tools').specs.v2;

/**
 * Validate swagger object provided
 */
var validate = function(config){
    spec.validate(config, function (err, result) {
        if (err) {
            throw err;
        }
        if (typeof result !== 'undefined') {
            if (result.warnings.length > 0) {
                console.log('Warnings:');
                result.warnings.forEach(function (warn) {
                    console.log('#/' + warn.path.join('/') + ': ' + warn.message);
                });
            }
            if (result.errors.length > 0) {
                var message = 'The Swagger document is invalid...\nErrors:\n';
                result.errors.forEach(function (err) {
                    message += '#/' + err.path.join('/') + ': ' + err.message+'\n';
                });
                throw new Error(message);
            }
        }
    });
};

/**
 * Exports factory for SwaggerAPIMock
 */
module.exports = (function () {

    /**
     * @param config {Object} swagger.json file contents
     * @param options {Object} :
     *   - defaultLimit {number} default limit for number of generated mock objects from swagger.json:definitions
     *   - mockData {Object} default mock data (see /test/mock_data.json)
     *   - defaultMin {number} default min length regular expressions used for generating random values for parameters
     *   - defaultMax {number} as defaultMin but max
     * @param responseCallback function to be called when matching path found
     * @param responseCallback {Function} to be called when matching path found
     *       it accepts three parameters:
     *          - path {string} - path string as in swagger.json
     *          - method {string} - request method (e.g. get, post)
     *          - operation {Object} - Operation Object according to the swagger specifications
     *       must return a function;
     * @example
     *     // For more examples see test/swagger-api-mock.js
     *     var SwaggerAPIMock = require('swagger-api-mock');
     *     var callback = function(path, method, operation){
     *       return function(params, data){
     *          .....
     *       };
     *     });
     *     var swaggerAPIMock = new SwaggerAPIMock(config, options, callback);
     *     var matchingRoute = swaggerAPIMock.route.match('post', '/v1/products');
     *     if(matchingRoute) var response = matchingRoute.fn(matchingRoute.params, [{new:'data'}]);
     *
     * @constructor
     */
    function SwaggerAPIMock(config, options, responseCallback) {
        validate(config);
        this.config = config;
        this.options = _.merge({
            ignoreHost: true,
            defaultLimit: 2,
            defaultMin: 0,
            defaultMax: 15
        },options);
        this.mockData = new MockData(config, this.options);
        this.mockData.generate();
        this.router = new ApiRouter(config, this.options, responseCallback);
    }

    return SwaggerAPIMock;
})();