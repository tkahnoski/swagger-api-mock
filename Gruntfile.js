'use strict';

module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        simplemocha: {
            options: {
                reporter: 'spec',
                timeout: '15000'
            },
            lib: {
                src: ['test/*.js']
            }
        },
        jshint: {
            options: {
                jshintrc: 'config/.jshintrc',
                reporter: require('jshint-stylish')
            },
            test: {
                options: {
                    jshintrc: 'config/.jshintrc-test'
                },
                src: ['test/**/*.js']
            },
            src: {
                src: ['lib/**/*.js']
            }
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'simplemocha'
    ]);

};
