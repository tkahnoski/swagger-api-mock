var _ = require('lodash');
var helpers = require('./helpers');
var Routes = require('routes');
var url = require('url');

/**
 * Convert swagger formatted path into Routes.js format
 *  e.g. "/products/{productId}" => "/products/:productId([a-zA-Z0-9-]{0,20})", where
 *  regular expression depends on the parameter type and options. See helpers.getItemFormatPattern()
 *
 * @param host {host} - host string from swagger.json
 * @param path {string} - path string as in swagger.json
 * @param operation {Object} - Operation Object according to the swagger specifications
 * @param options {Object}
 * @returns {*}
 */
var correctPath = function(host, path, operation, options) {
    if(!operation.parameters){
        return path;
    }
    var first = '';
    if (path.charAt(0) === '/') {
        first = '/';
    }
    if(host!==false){
        //TODO handle host and schemes (https, etc.)
    }
    var uri = path.replace(/^\/?|\/?$/, ''); //remove "/" from beginning and end
    var segments = uri.split('/');

    var getParameterByName = function(name){
        var parameter = null;
        _.forEach(operation.parameters, function (_parameter) {
            if(_parameter.name === name){
                parameter = _parameter;
            }
        });
        return parameter;
    };

    return first + segments.map(function (segment) {
            if (segment.charAt(0) === '{' && segment.charAt(segment.length - 1) === '}') {
                var parameter = getParameterByName(segment.slice(1, -1));
                if(parameter){
                    var itemFormat = helpers.getItemFormat(parameter);
                    var pattern = helpers.getItemFormatPattern(itemFormat, options);
                    if(pattern){
                        return ':' + parameter.name +'('+pattern+')';
                    }
                }
            }
            return segment;
        }).join('/');
};

/**
 * Shared method for building correct route string
 * @param method {string} - request method
 * @param path {string} - request path (usually, pre-modified at correctPath() )
 * @returns {string}
 */
var getPathString = function(method, path){
    return method+'/' + path;
};

/**
 * Parse query parameters from a url
 * @param query {string} e.g. param1=foo&param2=bar
 * @returns {Object} key-valuer params (e.g. {param1:'foo', param2:'bar'})
 */
var parseQuery = function(query) {
    var parsed = {};
    if(query){
        var a = query.split('&'), key;
        for (var i=0; i< a.length; i++){
            var b = a[i].split('=');
            key = decodeURIComponent(b[0]);
            parsed[key] = decodeURIComponent(b[1]);
        }
    }
    return parsed;
};

/**
 * Exports factory for ApiRouter
 */
module.exports = (function() {

    /**
     * depends on node 'routes' (Routes.js) module - url-style dispatcher
     * @see github.com/aaronblohowiak/routes.js
     */
    var router = new Routes();

    /**
     * Create a route dispatcher for each path from swagger.json
     * It associates paths with callback
     *
     * @param config {Object} swagger.json file contents
     * @param options {Object} :
     *   - ignoreHost {boolean} whether 'host' from 'config' should be ignored when creating routes //TODO implementation for host is not finished; see correctPath()
     *   - defaultLimit {number} default limit for number of generated mock objects from swagger.json:definitions
     *   - mockData {Object} default mock data (see /test/mock_data.json)
     *   - defaultMin {number} default min length regular expressions used for generating random values for parameters
     *   - defaultMax {number} as defaultMin but max
     * @param callback {Function} to be called on matching path;
     *       it accepts three parameters:
     *          - path {string} - path string as in swagger.json
     *          - method {string} - request method (e.g. get, post)
     *          - operation {Object} - Operation Object according to the swagger specifications
     *       must return a function;
     * @example
     *     var callback = function(path, method, operation){
     *       return function(params, data){
     *          .....
     *       };
     *     });
     *     var apiRouter = new ApiRouter(config, options, callback);
     *     var matchingRoute = apiRouter.match('post', '/v1/products');
     *     if(matchingRoute) var response = matchingRoute.fn(matchingRoute.params, [{new:'data'}]);
     * @constructor
     */
    function ApiRouter(config, options, callback){
        _.forEach(config.paths, function (methods, url) {
            _.forEach(methods, function (operation, method) {
                var route = correctPath(
                    (options.ignoreHost ? false : config.host),
                    helpers.joinPaths([config.basePath, url]),
                    operation,
                    options
                );
                //Only get, post, put, delete method allowed
                if (['get', 'post', 'put', 'delete'].indexOf(method) > -1){
                    var response = callback(helpers.joinPaths([config.basePath, url]), method, operation);
                    router.addRoute(getPathString(method, route), response);
                }
            });
        });
    }

    /**
     * Find if path matches defined dispatching rules
     * @param method {string} - request method (e.g. get, post)
     * @param path {string} - request url (e.g. /v1/products/123 )
     * @returns {Object} see Routes.js
     */
    ApiRouter.prototype.match = function(method, path){
        var parsedPath = url.parse(path);
        var matchingRoute = router.match(getPathString(method, parsedPath.pathname));
        if(matchingRoute){
            _.merge(matchingRoute.params, parseQuery(parsedPath.query));
        }
        return matchingRoute;
    };

    return ApiRouter;
})();



