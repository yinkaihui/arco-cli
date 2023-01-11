/* eslint-disable */
const path = require('path');
const { exec, execSync } = require('child_process');
const fs = require('fs');

const DIR_PACKAGES = path.resolve(__dirname, '../packages');

/**
 * @returns {Promise<{ name: string; location: string }>}
 */
async function getPkgs() {
  return new Promise((resolve, reject) => {
    exec('lerna list --json', (error, stdout, stderr) => {
      const errMsg = 'Failed to collect packages info via [lerna list]';

      if (error) {
        reject({
          error,
          msg: errMsg,
        });
      }

      try {
        const infoList = JSON.parse(stdout).filter(({ location }) =>
          location.startsWith(DIR_PACKAGES)
        );

        resolve(infoList);
      } catch (error) {
        reject({
          error,
          msg: stderr || errMsg,
        });
      }
    });
  });
}

async function releaseVersion() {
  const list = await getPkgs();

  await Promise.all(
    list.map(({ name, version, location }) => {
      const pkgJsonPath = location + '/package.json';
      const pkgJson = require(pkgJsonPath);
      const versionArr = pkgJson.version.split('.');

      pkgJson.version = [...versionArr.slice(0, -1), Number(versionArr.pop()) + 1].join('.');

      // pkgJson.private = true;
      pkgJson.publishConfig = {
        '@yinkaihui:registry': 'https://npm.pkg.github.com',
      };

      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

      return execSync(`

        cd ${location}
        npm publish --access=restricted`);
    })
  );

  process.exit(0);
}

releaseVersion();
