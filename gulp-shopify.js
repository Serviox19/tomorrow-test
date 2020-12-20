// child_process is used to spawn the scss-lint binary
var child_process = require('child_process');
// map-stream is used to create a stream that runs an async function
var map = require('map-stream');
// gulp-util is used to created well-formed plugin errors
var gutil = require('gulp-util');

// The main function for the plugin – what the user calls – should return
// a stream.
var scssLintPlugin = function() {
   // Run the scss-lint binary in a separate process, inheriting all stdio
   // from the gulp process.  Errors and stdout will be logged by gulp.
   function spawnScssLint(filePaths) {
      return child_process.spawn('scss-lint', filePaths, {
         stdio: 'inherit'
      });
   }

   // Create and return a stream that, for each file, asynchronously
   // processes the file through scss-lint and calls the callback method
   // when complete.
   return map(function(file, cb) {
      var lint = spawnScssLint([file.path]);

      // When scss-lint closes, check its status code for an error.
      // SCSS-Lint defines status code 65 as indicating a lint warning or error.
      // We don't want lint problems to kill gulp, so status code 65 is not
      // transformed into a stream error.
      lint.on('close', function(code) {
         if (code && 65 !== code) {
            var error = gutil.PluginError('gulp-scsslint', 'SCSS-Lint returned ' + code);
         }

         // Call the callback function with an error (which should be falsey
         // if no error occurred) and the given file.
         cb(error, file);
      });
   });
};

// Export the plugin main function
module.exports = scssLintPlugin;
