'use strict';
module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);
    grunt.initConfig({
        express: {
            options: {
                 port: 8080,
            },
            dev: {
                options: {
                    script: 'app.js'
                }
            }
        },
        watch: {
            express: {
                files: ['**/*.js'],
                tasks: ['express:dev'],
                options: {
                    spawn: false // for grunt-contrib-watch v0.5.0+, "nospawn: true" for lower versions. Without this option specified express won't be reloaded
                }
            }
        }
    });
    grunt.registerTask('default', ['express:dev','watch']);
}