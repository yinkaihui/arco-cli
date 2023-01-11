/* eslint-disable */
const glob = require('glob');
const path = require('path');
// const readline = require('readline');
const fs = require('fs');

const pkgPrefix = '@yinkaihui/cli-next-';
const targetPkgPrefix = '@arco-cli/';
// @yinkaihui/arco-cli-next-bundler => @yinkaihui/arco-cli-next-bunder

const files = glob.sync(path.resolve(__dirname, `../**/*.*`), { ignore: ['**/node_modules/**'] });

(async () => {
  await Promise.all(
    files
      .filter((x) => x !== __filename)
      .map((file) => {
        if (file.indexOf('/package.json') > -1) {
          const json = require(file);
          Object.keys(json.dependencies).forEach((key) => {
            if (key.indexOf(targetPkgPrefix) === 0) {
              json.dependencies[key] = '~0';
            }
          });
          fs.writeFileSync(file, JSON.stringify(json, null, 2));
        }

        const isJSON = file.indexOf(/\.json$/) > -1;
        const content = fs.readFileSync(file).toString();
        const newContent = content.replace(new RegExp(targetPkgPrefix, 'g'), pkgPrefix);

        if (content !== newContent) {
          console.log('replace file success: ', file);

          fs.writeFileSync(file, isJSON ? JSON.stringify(newContent, null, 2) : newContent);
        }
      })
  );

  process.exit(0);
})();
