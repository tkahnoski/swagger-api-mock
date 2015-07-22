'use strict';

var _ = require('lodash');
var RandExp = require('randexp');
var helpers = require('./helpers');

/**
 * Exports factory for MockData
 */
module.exports = (function () {

    /**
     * Generate mock data based on the definitions defined at swagger.json
     * @param config {Object} swagger.json file contents
     * @param options {Object} :
     *   - defaultLimit {number} default limit for number of generated mock objects from swagger.json:definitions
     *   - mockData {Object} default mock data (see /test/mock_data.json)
     *   - defaultMin {number} default min length regular expressions used for generating random values for parameters
     *   - defaultMax {number} as defaultMin but max
     * @constructor
     */
    function MockData(config, options) {
        this.config = config;
        this.options = options;
        this.data = {};
    }

    /**
     * Initiate generation of the mock data
     * @returns {*}
     */
    MockData.prototype.generate = function () {
        this.setDefinitions();
        var self = this, limit, mockData, i;

        //pre-mocked data is saved as it is if not mentioned in definitions
        _.forEach(this.options.mockData, function (mockData, name) {
            if(!self.definitions[name]){
                self.data[name] = mockData;
            }
        });

        _.forEach(this.definitions, function (mockObject, name) {
            limit = self.options.defaultLimit;
            //TODO enum is the length of array for mock data
            mockData = [];
            if ((self.options.mockData[name] instanceof Array) && self.options.mockData[name].length>0) {
                mockData = self.options.mockData[name];
                limit = self.options.mockData[name].length;
            }
            if (typeof self.data[name] === 'undefined') {
                self.data[name] = [];
            }
            for (i = 0; i < limit; i++) {
                self.data[name].push(self.mockObject(name, mockData[i]));
            }
        });
        return this.data;
    };

    /**
     * Prepare constructors for definitions defined at swagger.json
     */
    MockData.prototype.setDefinitions = function () {
        if (!this.definitions) {
            this.definitions = {};
            var self = this,
                definitions = this.config.definitions;
            if (definitions) {
                /**
                 * Create constructor function for object name (e.g. Product)
                 * @param name {string}
                 * @param definition {object}
                 * @returns {Function} constructor
                 */
                var getConstructor = function (name, definition) {
                    var properties = definition.properties,
                        required = (definition.required instanceof Array) ? definition.required : [];
                    return function (mockData) {
                        //If mock data object is set to null - return empty mock object
                        if(mockData === null){
                            return;
                        }
                        var obj = this, mockProperty;
                        _.forEach(properties, function (property, name) {
                            if (mockData && (typeof mockData[name] !== 'undefined')) {
                                mockProperty = mockData[name];
                            }
                            property.required = (required.indexOf(name) > -1);
                            obj[name] = self.generateValue(property, mockProperty);
                        });
                    };
                };

                _.forEach(definitions, function (definition, name) {
                    self.definitions[name] = getConstructor(name, definition);
                });
            }
        }
    };

    /**
     * Generate mocked object for a definition
     * @param type {string} name of definition (e.g. Product)
     * @param mockData {Object} pre-defined mock data (see test/mock_data.json)
     * @returns {Object} mocked object
     */
    MockData.prototype.mockObject = function (type, mockData) {
        this.setDefinitions();
        var self = this;
        var newObject = function(){
            var o = new self.definitions[type](mockData);
            //stringify and parse in order to reset constructor for the object
            return JSON.parse(JSON.stringify(o));
        };
        return (typeof this.definitions[type] === 'undefined') ? null : newObject();
    };

    /**
     * Generate property value for a mocked object
     * @param property {Object} property object of a parameter
     * @param mockProperty {*} pre-defined mock value
     * @returns {*}
     */
    MockData.prototype.generateValue = function (property, mockProperty) {
        var itemFormat = helpers.getItemFormat(property);
        var type = itemFormat.type;
        //TODO handle enum, allOf, default. see http://swagger.io/specification

        if (['string', 'number', 'integer', 'boolean'].indexOf(type) > -1) {
            if (mockProperty) {
                return mockProperty;
            }
            return new RandExp(helpers.getItemFormatPattern(itemFormat, this.options)).gen();
        }
        else if (type === 'array') {
            var elements = [], length;
            if (mockProperty) {
                length = mockProperty.length;
            }
            else {
                //get random number
                length = 1; // TODO consider maxItems and minItems
            }
            for (var i = 0; i < length; i++) {
                elements.push(this.generateValue(itemFormat.items, (mockProperty ? mockProperty[i] : null)));
            }
            return elements;
        }
        else if (type === 'file') {
            return null;
        }
        else {
            return this.mockObject(type, mockProperty);
        }
    };

    return MockData;
})();