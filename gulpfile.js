var gulp = require('gulp');
var webserver = require('gulp-webserver');
var inject = require('gulp-inject');
var util = require('gulp-util');
var debug = require('gulp-debug'); // https://www.npmjs.com/package/gulp-debug
var jshint = require('gulp-jshint'); // https://github.com/spalger/gulp-jshint
var jscs = require('gulp-jscs'); // https://github.com/jscs-dev/gulp-jscs
var yargs = require('yargs').argv; // https://www.npmjs.com/package/yargs
var gulpif = require('gulp-if'); // https://github.com/robrich/gulp-if
var annotate = require('gulp-ng-annotate'); // https://www.npmjs.com/package/gulp-ng-annotate
var filter = require('gulp-filter'); // https://www.npmjs.com/package/gulp-filter
var uglify = require('gulp-uglify'); // https://github.com/terinjokes/gulp-uglify
var useref = require('gulp-useref'); // https://www.npmjs.com/package/gulp-useref
var minify = require('gulp-minify-css'); // https://www.npmjs.com/package/gulp-minify-css
var imagemin = require('gulp-imagemin'); // https://github.com/sindresorhus/gulp-imagemin
var listing = require('gulp-task-listing'); // https://www.npmjs.com/package/gulp-task-listing

// global configuration object
// to centralize the configs in
// one place
var config = {
    index: 'app/index.html',
    root: './',
    app: 'app/',
    build: 'build/app/',
    libs: 'bower_components/',
    images: 'app/images/*.*',
    jsfiles: [
        'app/**/*.module.js',
        'app/**/*.js'
    ],
    cssfiles: [
        'app/*.css'
    ],
    bowerjson: './bower.json',
    bowerfiles: 'bower_components/**/*'
};


/*
 * Launch a webserver to serve the development build
 */

gulp.task('serve', ['bower-html-inject', 'webserver', 'watchers'], function(){
    util.log(util.colors.bgBlue('Serving Development'));
});

// https://github.com/schickling/gulp-webserver
// http://stephenradford.me/gulp-angularjs-and-html5mode/
gulp.task('webserver', ['dev-settings'], function() {
    gulp.src(config.root)
        .pipe(webserver({
            fallback: config.index,
            livereload: true,
            open: true
        }));
});

/*
 * Launch a webserver to serve the production build
 */

gulp.task('serve-production', ['build'], function() {
    util.log(util.colors.bgBlue('Serving Production Build'));
    gulp.src(config.build)
        .pipe(webserver({
            fallback: 'index.html',
            livereload: true,
            open: true
        }));
});

/*
 *  watcher setup
 */

gulp.task('watchers', function(){
    util.log(util.colors.bgBlue('Setting Up Watchers'));
    gulp.watch(config.jsfiles.concat(config.cssfiles), ['html-inject']);
    // we could set up here a watcher for the bower files, but that means the task
    // will run twice on install, and also none on uninstall since there appears
    // to be some issues with the watch task and also with the gaze dependency
    // so we decided to go back and use bower hooks, unfortunately bower does not
    // have a postuninstall hook, so we are f... well, i've discover that it supports preuninstall
    // so we are going that route, see the .bowerrc file
    // gulp.watch(config.bowerfiles, ['bower-inject']);
});

/*
 *  Read the js and css files from the filesystem
 *  as defined in the config.files array and inject
 *  them in the index.html file using gulp inject
 *
 *  @bug when adding folders gulp might crash, at least in linux
 *  the problem seems to be with gaze, and has no easy solution
 */

gulp.task('html-inject', function() {
    // gulp util uses chalk, see reference
    // https://github.com/chalk/chalk
    util.log(util.colors.bgBlue('Custom Code HTML Inject'));
    return gulp
        .src(config.index)
        // gulp src options: https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpsrcglobs-options
        // we do not need to read the file content, all we need here are the paths
        // gulp inject options: https://github.com/klei/gulp-inject#optionsrelative
        // we want the inject to be relative to the target (index.html) and not
        // the current working dir as is the default
        .pipe(inject(gulp.src(config.jsfiles.concat(config.cssfiles), {read: false}), {relative: false}))
        .pipe(gulp.dest(config.app));
});

/*
 *  Uses Wiredep to read dependencies from bower.json file
 *  and inject them in the index.html file
 *  this task is called by the hooks defined in .bowerrc
 *  we have setup a task dependency on html-inject because
 *  on launch if we have two tasks in parallel injecting in the html
 *  on of them will override the changes made by the other
 */

gulp.task('bower-html-inject', ['html-inject'], function() {
    util.log(util.colors.bgBlue('Bower Dependencies HTML Inject'));
    var wiredep = require('wiredep').stream;

    var options = {
        bowerJson: require(config.bowerjson),
        directory: config.libs
    };

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe(gulp.dest(config.app));
});

/*
 * Lints JavaScript code and enforces coding style. Rules are
 * defined in .jshintrc and .jscsrc respectively
 * @todo implement a run sequence to avoid this ugly hack
 */

gulp.task('check', ['check-jscs']);

// stylish reporter https://github.com/sindresorhus/jshint-stylish
gulp.task('check-jshint', function() {
    return gulp
        .src(config.jsfiles)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'), {verbose: true});
});

gulp.task('check-jscs', ['check-jshint'], function() {
    util.log(util.colors.bgBlue('Code check using JSHint and JSCS'));
    return gulp
        .src(config.jsfiles)
        .pipe(jscs())
        .pipe(jscs.reporter());
});

/*
 * Create a build to prepare the app for production
 */

gulp.task('build', ['bower-html-inject', 'html-inject', 'images', 'production-settings'], function(){
    util.log(util.colors.bgBlue('Building App for Production'));
    return gulp
        .src('app/**/*.html')
        .pipe(useref())
        .pipe(gulpif('*.js', annotate()))
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minify()))
        .pipe(gulp.dest(config.build));
});

/*
 * Compresses images and copies them to the build folder
 */

gulp.task('images',function(){
    util.log(util.colors.bgBlue('Compressing and Copying Images to Build Folder'));
    return gulp
        .src(config.images)
        .pipe(imagemin())
        .pipe(gulp.dest(config.build + 'images'));
});

/*
 * Copies development settings file to app folder
 */

gulp.task('dev-settings',function(){
    util.log(util.colors.bgBlue('Copying Development Settings File'));
    return gulp
        .src('dist/angular/development/app.settings.js')
        .pipe(gulp.dest(config.app));
});

/*
 * Copies production settings file to app folder
 */

gulp.task('production-settings',function(){
    util.log(util.colors.bgBlue('Copying Production Settings File'));
    return gulp
        .src('dist/angular/production/app.settings.js')
        .pipe(gulp.dest(config.app));
});


/*
 * Lists all available tasks
 * @todo customize list by overring filters
 * By default, is is defined as the regular expression /[-_:]/
 * which means that any task with a hyphen, underscore, or colon in it's name is assumed to be a subtask
 */
gulp.task('help', listing);

// setting up the default task, this just calls the help task
gulp.task('default', ['help']);
