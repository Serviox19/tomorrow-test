'use strict';

// Gulp module imports
import { src, dest, watch, parallel, series } from 'gulp';
import read from 'read-yaml';
import path from 'path';
import del from 'del';
import browserSync from 'browser-sync';
import sass from 'gulp-sass';
import minifycss from 'gulp-minify-css';
import gulpif from 'gulp-if';
import babel from 'gulp-babel';
import sourcemaps from 'gulp-sourcemaps';
import rollup from 'gulp-better-rollup';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify';
import touch from 'gulp-touch-cmd';
import yargs from 'yargs';
import themeKit from '@shopify/themekit';

const config = read.sync('config.yml');
const themeID = config.development.theme_id;
const storeURL = config.development.store;

// Paths
const paths = {
  sass: {
    src: 'src/scss/*.scss',
    dest: 'dist/assets',
    watch: 'src/scss/**/*.scss'
  },
  js: {
    src: 'src/js/app.js',
    dest: 'dist/assets',
    watch: 'src/js/**/*.js'
  }
}

// Recognise `--production` argument
const argv = yargs.argv;
const production = !!argv.production;

function colorCodeString(data){
  data = data.replace(/\[([^\]]+)\]/g, '[\x1b[32m$1\x1b[0m]'); // handles files [folder]/[file]
  data = data.replace(/](\s\w+\s)(.+)/g, ']$1\x1b[34m$2\x1b[0m'); // handles env [<env>]
  data = data.replace(/]\s([A-Za-z0-9_]+):/g, '] \x1b[33m$1\x1b[0m:'); // handles store [store]:
  data = data.replace(/(\s\d+\s)/g, '\x1b[33m$1\x1b[0m'); // handles theme_id [theme_id]
  return data;
}

function themkitInit(env, bs) {
  let timeout;
  const options = {
    allowLive: true,
    env: env,
    config: path.resolve(__dirname, 'config.yml')
  };
  themeKit.command('watch', options, {
    pipe: ['inherit', 'pipe', 'pipe']
  }).then(child => {
    child.stdout.on('data', function(data) {
      let dataString = data.toString()
      let dataOut = colorCodeString(dataString);
      if (browserSync) {
        if (
          dataString.match('Updated') &&
          !dataString.match('processing') &&
          !dataString.match(/\.map$/g) &&
          !dataString.match('overrides.css') &&
          !dataString.match('overrides.css.map') &&
          !dataString.match(/\.(png|jpe?g|gif|svg|ttf|woff2?|otf)/)) {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            browserSync.reload()
          }, 500);
        } else if (dataString.match('Updated') && dataString.match('overrides.css')) {
          timeout = setTimeout(() => {
            browserSync.reload()
          }, 2000);
          // browserSync.stream()
        }
      } else {
        console.clear()
      }
      console.log(dataOut.trim());
    })
  }).catch(e => {
    console.log(e);
  });
}

// Main Tasks

// Styles
export const buildStyles = () => src(paths.sass.src)
  .pipe(sass.sync().on('error', sass.logError))
  .pipe(minifycss())
  // .pipe(gulpif(production, minifycss()))
  .pipe(concat('overrides.css'))
  .pipe(dest(paths.sass.dest))
  .pipe(notify('Override Styls Generated...touching.'))
  .pipe(touch());

// Scripts
export const buildScripts = () => src(paths.js.src)
  .pipe(plumber())
  .pipe(sourcemaps.init())
  .pipe(rollup({
    plugins: [babel({
      "presets": ["@babel/env"]
    })]
  }, {
    format: 'cjs',
  }))
  .pipe(concat('overrides.js'))
  .pipe(uglify())
  .pipe(sourcemaps.write())
  .pipe(dest(paths.js.dest))
  .pipe(touch());

// Clean
export const clean = () => del(['build']);

// Watch Task
export const devWatch = () => {
  browserSync.create()
  browserSync.init({
    proxy: `https://${storeURL}?preview_theme_id=${themeID}&_fd=0`,
    callbacks: {
      ready: (err, bs) => {
        console.clear()
        themkitInit(Object.keys(config).pop(), bs)
      }
    },
    snippetOptions: {
        rule: {
            match: /<\/body>/i,
            fn: function (snippet, match) {
                return snippet + match;
            }
        }
    }
  });
  watch(paths.sass.watch, buildStyles);
  watch(paths.js.watch, buildScripts);
};

// Development Task
export const dev = series(clean, parallel(buildStyles), parallel(buildScripts), devWatch);

// Serve Task
export const build = series(clean, parallel(buildStyles), parallel(buildScripts));

// Default task
export default dev;
