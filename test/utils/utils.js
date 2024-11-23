const child = require('child_process');
const path = require('path');

const chalk = require('chalk');

const common = require('../../src/common');

// Capture process.stderr.write, otherwise we have a conflict with mocks.js
const _processStderrWrite = process.stderr.write.bind(process.stderr);

function numLines(str) {
  return typeof str === 'string' ? (str.match(/\n/g) || []).length + 1 : 0;
}
exports.numLines = numLines;

function getTempDir() {
  // a very random directory
  return ('tmp' + Math.random() + Math.random()).replace(/\./g, '');
}
exports.getTempDir = getTempDir;

// On Windows, symlinks for files need admin permissions. This helper
// skips certain tests if we are on Windows and got an EPERM error
function skipOnWinForEPERM(action, testCase) {
  const ret = action();
  const error = ret.code;
  const isWindows = process.platform === 'win32';
  if (isWindows && error && /EPERM:/.test(error)) {
    _processStderrWrite('Got EPERM when testing symlinks on Windows. Assuming non-admin environment and skipping test.\n');
  } else {
    testCase();
  }
}
exports.skipOnWinForEPERM = skipOnWinForEPERM;

function runScript(script, cb) {
  child.execFile(common.config.execPath, ['-e', script], cb);
}
exports.runScript = runScript;

function sleep(time) {
  const testDirectoryPath = path.dirname(__dirname);
  child.execFileSync(common.config.execPath, [
    path.join(testDirectoryPath, 'resources', 'exec', 'slow.js'),
    time.toString(),
  ]);
}
exports.sleep = sleep;

function mkfifo(dir) {
  if (process.platform !== 'win32') {
    const fifo = dir + 'fifo';
    child.execFileSync('mkfifo', [fifo]);
    return fifo;
  }
  return null;
}
exports.mkfifo = mkfifo;

function skipIfTrue(booleanValue, t, closure) {
  if (booleanValue) {
    _processStderrWrite(
      chalk.yellow('Warning: skipping platform-dependent test ') +
      chalk.bold.white(`'${t.title}'`) +
      '\n'
    );
    t.truthy(true); // dummy assertion to satisfy ava v0.19+
  } else {
    closure();
  }
}

exports.skipOnUnix = skipIfTrue.bind(module.exports, process.platform !== 'win32');
exports.skipOnWin = skipIfTrue.bind(module.exports, process.platform === 'win32');

  /**
   * @function sortResult
   * @param {array|string} value An array or string containing file names.
   * If input is a string, file names are separated by a space or newline.
   * @returns {array|string} Sorted file names. If input is a string,
   * files names are joined by a space; otherwise, an array is returned.
   *
   * Regarding the use of sort on tests' result.stdout:
   *
   * In the latest versions of the glob package for Node.js,
   * the nosort option has been removed. This was done to
   * improve performance by maximizing parallelism in the
   * file system walk.
   *
   * Here's how to handle the lack of nosort:
   *
   * Accept the default behavior:
   * If the order of the matched files isn't critical,
   * you can simply use glob without any special handling.
   *
   * Sort the results manually:
   * If you need to sort the results in a specific way,
   * you can use the sort method on the array returned by glob:
   *
   *  const glob = require('glob');
   *
   *  glob('**\/*.js', (err, files) => {
   *      if (err) {
   *          console.error(err);
   *          return;
   *      }
   *
   *      // Sort the files alphabetically
   *      files.sort();
   *
   *      console.log(files);
   *  });
   */
const sortResult = (value) => {
  const typeOfValue = typeof value;
  const isString = typeOfValue === 'string';

  const sortArray = (arr) => arr.sort((a, b) => a.localeCompare(b));

  const sortString = (str) => {
    const fileNames = str.split(/\s/).map((fileName) => fileName.trim());
    return `${sortArray(fileNames).join(' ').trim()}\n`;
  };

  return isString ? sortString(value) : sortArray(value);
};

exports.sortResult = sortResult;
