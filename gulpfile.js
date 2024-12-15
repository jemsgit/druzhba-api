const { src, dest, series } = require("gulp");
const del = require("del");

function copy(cb) {
  src("*.json").pipe(dest("./dist"));
  src(".env").pipe(dest("./dist"));
  src("src/*.js").pipe(dest("dist/"));
  cb();
  cb();
}

function clean(cb) {
  del("dist/**", { force: true });
  cb();
}

exports.default = series(clean, copy);
