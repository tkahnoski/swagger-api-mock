var _ = require('lodash');

String.prototype.toUpperCaseFirst = function () {
    var str = this.toString();
    return str.charAt(0).toUpperCase() + str.slice(1);
};

module.exports = (function() {

    /**
     * Join multiple paths into one string, takes care of forward-slashes
     * @example
     *   joinPath(["path1","path2"]);   // returns "path1/path2"
     *   joinPath(["path1/","/path2"]); // returns "path1/path2"
     * @param paths {Array}
     * @returns {String}
     */
	this.joinPaths = function(paths) {
		var path;
		for(var i=0; i<paths.length; i++){
		  if(!path){ 
			path = paths[i];
		  }
		  else {
			path += paths[i].replace(/^\//, '');
		  }
		  if(paths[i+1]){
			path = path.replace(/\/$/,'')+'/';
		  }
		}
		return path;
	};

    /**
     * Get service name from its url
     * It considers the first part of the url as the service name
     * e.g. '/products' and '/products/{productId}/images' urls have the same service name: 'Products'
     *
     * @param url {string}
     * @returns {string}
     */
    this.getServiceNameFromUrl = function(url){
        var elements = url.replace(/^\//, '').split('/');
        return elements.shift().toUpperCaseFirst();
    };

    /**
     * Used to generate method operationId based on its url if the operationId was not provided.
     * Subtracts service name is url contains not only service name
     * e.g.
     *  get, /products/{productId}/images => getProductIdImages
     *  post, /products => postProducts
     *
     * @param method {string}
     * @param url {string}
     * @returns {*}
     */
    this.getOperationIdFromUrl = function(method, url){
        var elements = url.replace(/^\//, '').replace('{', '').replace('}', '').split('/');
        if(elements.length === 1) {
            return method+elements[0].toUpperCaseFirst();
        }
        elements.shift();
        var id='';
        _.forEach(elements, function(element) {
            id += element.toUpperCaseFirst();
        });
        return method+id;
    };

    /**
     *
     * @param item {Object} - one of [Parameter Object, Schema Object, Reference Object, Items Object, Header Object]
     *                        according to the Swagger RESTful API Documentation Specification http://swagger.io/specification
     * @returns {*}
     */
    this.getItemFormat = function(item){
        item = JSON.parse(JSON.stringify(item)); //remove referencing
        if(typeof item.schema !== 'undefined'){
            item = item.schema;
        }
        if(typeof item.$ref !== 'undefined' && item.$ref){
            return {type: item.$ref.replace('#/definitions/', '')};
        }
        return item;
    };

    /**
     * Get regexp pattern depending on type
     *
     * @param itemFormat {Object} result of getItemFormat()
     * @param options {Object} additional options
     * @returns {string|string|*}
     */
    this.getItemFormatPattern = function(itemFormat, options){
        var type = itemFormat.type;
        if((typeof itemFormat.pattern === 'undefined') || !itemFormat.pattern){
            var min = options.defaultMin,
                max = options.defaultMax;
            if(itemFormat.required === true || itemFormat.required === 'true') {
                min = 1;
            }
            if(typeof itemFormat.minLength !== 'undefined') {
                min = itemFormat.minLength;
            }
            if(typeof itemFormat.maxLength !== 'undefined') {
                max = itemFormat.maxLength;
            }
            switch(type){
                case 'boolean':
                    itemFormat.pattern = 'true|false';
                    break;
                case 'number':
                    itemFormat.pattern = '[0-9]{'+min+','+max+'}';
                    break;
                case 'integer':
                    itemFormat.pattern = '[0-9]{'+min+','+max+'}'; //'[-]?[0-9]{'+min+','+max+'}';
                    break;
                case 'string':
                    itemFormat.pattern = '[a-zA-Z0-9-]{'+min+','+max+'}';
                    break;
            }
        }
        return itemFormat.pattern;
    };

    /**
     * Parse query parameters from a url
     * @param query {string} e.g. param1=foo&param2=bar
     * @returns {Object} key-valuer params (e.g. {param1:'foo', param2:'bar'})
     */
    this.parseQuery = function(query) {
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

    return this;

})();