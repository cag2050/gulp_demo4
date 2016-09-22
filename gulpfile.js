/**
 * Created by chenag on 2016/9/9.
 */
var gulp = require('gulp'),
    uglify = require('gulp-uglify'), // js压缩
    minifyHtml = require('gulp-minify-html'), // html压缩
    imagemin = require('gulp-imagemin'), // 图片压缩
    sourcemaps = require('gulp-sourcemaps'), // sourcemaps指向
    sass = require('gulp-sass'), // 编译sass
    importCss = require('gulp-import-css'), // 导入css
    minifyCss = require('gulp-minify-css'), // css压缩
    autoprefixer = require('gulp-autoprefixer'), // css自动前缀
    clean = require('gulp-clean'), // 清空文件
    yuidoc = require('gulp-yuidoc'), // 生成api文档
    runSequence = require('gulp-run-sequence'), // 按队列执行任务
    rev = require('gulp-rev'), // 更改版本名
    replace = require('gulp-replace'), // 字符替换
    revCollector = require('gulp-rev-collector'), // 更新静态资源引用路径
    babel = require('gulp-babel'), // 转换es6代码为es5
    concat = require('gulp-concat'); // 文件合并

//通配符
var character = "**/*.*";
var jsAndcss = "**/*.{js,css}";

//开发版路径
var src = {};
src.root = "src/";
src.js = src.root + "js/**/*.js";
src.img = src.root + "images/**/*.{png,jpg,gif,ico}";
src.html = src.root + "html/**/*.{htm,html}";
src.css = src.root + "css/**/*.css";
src.sass = src.root + "css/**/*.scss";
src.font = src.root + "css/font/**/*.*";

//发布版路径
var build = {};
build.root = "build/";
build.js = build.root + "js/";
build.img = build.root + "images/";
build.html = build.root + "html/";
build.css = build.root + "css/";
build.font = build.root + "css/font/";

//时间格式化函数
Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

//js压缩配置
var uglify_config = {
    mangle: {
        except: ['define', 'require', 'module', 'exports'],
        toplevel: true //变量混淆
    },
    compress: false
};

/*
 * 合并部分js底层类库
 * js任务里，没有的js，在此处合并
 */
gulp.task('lib', function () {
    var jslib = "js/lib/";
    console.log("js类库合并开始");
    gulp.src([
        src.root + jslib + 'jquery-1.12.2.min.js',
        src.root + jslib + 'bootstrap.min.js'
    ])
        .pipe(concat('lib.js'))
        .pipe(uglify(uglify_config))
        .pipe(gulp.dest(build.root + jslib));
    console.log("js类库合并完毕");
});

/* 构建js
 * 排除lib里已经构建的文件
 */
gulp.task('js', ['lib'], function () {
    console.log("脚本构建中...");
    // console.log(new Date().Format('yyyy-MM-dd hh:mm:ss'));
    gulp.src([src.js,
        "!" + src.root + "js/lib/bootstrap.min.js",
        "!" + src.root + "js/lib/jquery-1.12.2.min.js"])
        .pipe(babel({presets: ['es2015']}))
        .pipe(uglify(uglify_config))
        .pipe(gulp.dest(build.js));
    console.log("脚本构建完毕");
});

//构建image
gulp.task('img', function () {
    console.log("图片优化中...");
    gulp.src(src.img)
        .pipe(imagemin({
            optimizationLevel: 5, //类型：Number  默认：3  取值范围：0-7（优化等级）
            progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
            interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
            multipass: true //类型：Boolean 默认：false 多次优化svg直到完全优化
        }))
        .pipe(gulp.dest(build.img));
    console.log("图片构建完毕");
});

//构建css
gulp.task('css', function () {
    console.log("样式构建中...");
    //sass
    gulp.src(src.sass)
        .pipe(sass())
        .pipe(importCss())
        // .pipe(autoprefixer({browsers: ['> 1%']}))
        .pipe(sourcemaps.init())
        .pipe(minifyCss())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(build.css));
    //普通css
    gulp.src(src.css)
        .pipe(importCss())
        // .pipe(autoprefixer({browsers: ['> 1%']}))
        .pipe(sourcemaps.init())
        .pipe(minifyCss())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(build.css));
    //移动字体图标
    gulp.src(src.font)
        .pipe(gulp.dest(build.font));
    console.log("样式构建完毕");
});

// 打版本号并生成rev-manifest.json文件
gulp.task('rev', function () {
    console.log("版本号生成中...");
    gulp.src([src.root + jsAndcss, "!" + src.sass])
        .pipe(rev())
        .pipe(rev.manifest())
        .pipe(gulp.dest('rev/'));
    console.log("版本号已生成");
});

// 修改html文件，给静态文件js、css打戳
gulp.task('html', ['rev'], function () {
    console.log("更新时间戳进行中...");
    gulp.src(['rev/*.json', src.html])
        .pipe(revCollector({
            replaceReved: true
        }))
        // 修改为 ?v=stamp 形式
        .pipe(replace(/\-([0-9a-z]{8,})\.((min\.)?css|(min\.)?js)/g, function (a, b, c) {
            return '.' + c + '?v=' + b;
        }))
        //.pipe(minifyHtml({
        //    empty: true,
        //    spare: true,
        //    cdata: true
        //}))
        .pipe(gulp.dest(build.html));
    console.log("html时间戳更新完毕");
});

// 发布全部，包含js、css、img、html
gulp.task('release', function (def) {
    console.log("开始发布全部文件...");
    return runSequence('js', 'css', 'img', 'html', def);
});

//清理build下文件，不清理文件夹。如需清理文件夹，请手工删除
gulp.task('clean', function () {
    console.log("清理开始");
    gulp.src(
        [
            build.root + character
        ], {
            read: false
        })
        .pipe(clean({
            force: true
        }));
    console.log("清理完成");
});

//生成API文档
// gulp.task("yuidoc", function () {
//     console.log("API文档生成开始");
//     gulp.src(src.root + "js/**/*.js")
//         .pipe(yuidoc.parser())
//         .pipe(yuidoc.reporter())
//         .pipe(yuidoc.generator())
//         .pipe(gulp.dest("./doc"));
//     console.log("API文档生成成功");
// });

// 监控文件，自动处理
gulp.task('watch', function () {
    gulp.watch([src.css, src.sass, src.html, src.js], function (e) {
        var src_path = e.path,
            build_path = src_path.replace(/\\src\\/g, "/build/"),
            _build_path = build_path.substr(0, build_path.lastIndexOf("\\"));
        //console.log(src_path.indexOf("\\page\\"));
        console.log('文件：' + src_path + "被修改");
        if (src_path.indexOf(".scss") > -1) {
            console.log("SCSS文件正在生成...");
            gulp.src(src_path)
                .pipe(sass())
                .pipe(importCss())
                .pipe(sourcemaps.init())
                .pipe(minifyCss())
                .pipe(sourcemaps.write('.'))
                .pipe(gulp.dest(_build_path));
        } else if (src_path.indexOf(".css") > -1) {
            console.log("CSS文件正在生成...");
            //普通css
            gulp.src(src_path)
                .pipe(importCss())
                .pipe(sourcemaps.init())
                .pipe(minifyCss())
                .pipe(sourcemaps.write('.'))
                .pipe(gulp.dest(_build_path));
        } else if (src_path.indexOf(".html") > -1) {
            console.log("html文件正在生成...");
            gulp.src(src_path)
                .pipe(gulp.dest(_build_path));
        } else if (src_path.indexOf(".js") > -1) {
            console.log("js文件正在生成...");
            gulp.src(src_path)
                .pipe(uglify(uglify_config))
                .pipe(gulp.dest(_build_path));
        }
        console.log("修改后的文件已经生成");
        console.log("------" + new Date().Format("yyyy-MM-dd hh:mm:ss") + "------");
    });
    console.log("开始监控css、js、html变化");
});

// 默认任务
gulp.task('default', ['watch']);