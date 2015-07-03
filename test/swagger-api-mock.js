/*jshint -W079 */
'use strict';

var fs = require('fs');
var expect = require('expect.js');
var config = JSON.parse(fs.readFileSync(__dirname+'/swagger.json', 'utf8'));
var mockData = JSON.parse(fs.readFileSync(__dirname+'/mock_data.json', 'utf8'));
var options = {
    defaultLimit: 0,
    //defaultMax: 22,
    mockData: mockData
};

//TODO another way for xpath definitions would be to state them directly in swagger.json under x- name (e.g. x-path)
var xpaths = JSON.parse(fs.readFileSync(__dirname+'/mock_data_xpaths.json', 'utf8'));
var restJson = null;
var RestJson = require('rest-json');
var SwaggerAPIMock = require('../lib/swagger-api-mock');
var swaggerAPIMock = new SwaggerAPIMock(
    config,
    options,
    function(url, method, operation){
        //map by operation.operationId
        return function(params, data){
            if(xpaths[url] && xpaths[url].mock===true){
                var definitions = JSON.parse(JSON.stringify(xpaths[url][method] ? xpaths[url][method] : xpaths[url].request));
                if(definitions){
                    RestJson.prepareXpath(definitions, params);
                    RestJson.applyXpathParams(definitions, params);
                    //TODO extract produces json
                    // if not json but xml, use: var js2xmlparser = require("js2xmlparser"); js2xmlparser("person", data)
                    //operation.produces[0]
                    var prepareResponse = function(response){
                        if(definitions.type === 'array' && (response instanceof Array)) {
                            return response;
                        }
                        if(definitions.type !== 'array' && response !== null) {
                            return response;
                        }
                        return restJson.get({xpath: "//Error[code=404]"});
                    };
                    switch(method){
                        case 'post':
                            return prepareResponse(restJson.post(definitions, data));
                        case 'get':
                            return prepareResponse(restJson.get(definitions));
                        case 'put':
                            return prepareResponse(restJson.put(definitions, data));
                        case 'delete':
                            return prepareResponse(restJson.remove(definitions));
                    }
                }
            }
            return null;
        };
    });
restJson = new RestJson(swaggerAPIMock.mockData.data);

describe('SwaggerAPIMock', function () {

    it('generate mock data', function(){
        expect(swaggerAPIMock.mockData.data.Product.length).to.equal(3);
        expect(swaggerAPIMock.mockData.data.Product[0].id).to.equal(123);
        expect(swaggerAPIMock.mockData.data.Product[0].images[0].url).to.match(/^im[a-z0-9]{5,20}\.(jpg|png)$/);
    });

    it('access (get) mock data', function(){

        //GET

        var matchingRoute = swaggerAPIMock.router.match('get', '/v1/products');
        var response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.length).to.equal(3);
        expect(response[2].id).to.equal(125);

        matchingRoute = swaggerAPIMock.router.match('get', '/v1/products?category=books');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.length).to.equal(2);
        expect(response[1].id).to.equal(125);

        matchingRoute = swaggerAPIMock.router.match('get', '/v1/products/125');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.id).to.equal(125);

        matchingRoute = swaggerAPIMock.router.match('get', '/v1/products/999');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.code).to.equal(404);

    });

    it('manipulate (post, put, delete) mock data', function(){

        //POST

        var matchingRoute = swaggerAPIMock.router.match('post', '/v1/products');
        var response = matchingRoute.fn(matchingRoute.params, [{"id":999, "category":"new products"}]);
        expect(response.length).to.equal(4); //4 mocked products

        matchingRoute = swaggerAPIMock.router.match('get', '/v1/products/999');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.id).to.equal(999);
        expect(response.category).to.equal("new products");

        //PUT

        matchingRoute = swaggerAPIMock.router.match('put', '/v1/products/777');
        response = matchingRoute.fn(matchingRoute.params, {"category":"new products"});
        expect(response.code).to.equal(404);

        matchingRoute = swaggerAPIMock.router.match('put', '/v1/products/999');
        response = matchingRoute.fn(matchingRoute.params, {"category":"older products"});
        expect(response.id).to.equal(999);
        expect(response.category).to.equal("older products");

        //DELETE

        matchingRoute = swaggerAPIMock.router.match('delete', '/v1/products/666');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.code).to.equal(404);

        matchingRoute = swaggerAPIMock.router.match('delete', '/v1/products/999');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.id).to.equal(999);

        matchingRoute = swaggerAPIMock.router.match('get', '/v1/products/999');
        response = matchingRoute.fn(matchingRoute.params, null);
        expect(response.code).to.equal(404);

    });

});



