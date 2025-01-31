import path from 'path';
import fs from 'fs-extra';
import { render, version } from 'less';
import { BuildContext, BuildTaskResult } from '@arco-cli/builder';
import {
  Compiler,
  TranspileFileParams,
  TranspileFileOutput,
  CompilerOptions,
} from '@arco-cli/compiler';
import { DEFAULT_DIST_DIRNAME } from '@arco-cli/legacy/dist/constants';

export class LessCompiler implements Compiler {
  readonly displayName = 'Less';

  distDir: string;

  shouldCopyNonSupportedFiles = false;

  constructor(readonly id: string, options: Partial<CompilerOptions>) {
    this.distDir = options.distDir || DEFAULT_DIST_DIRNAME;
  }

  getDistPathBySrcPath(srcPath: string): string {
    return srcPath.replace('.less', '.css');
  }

  isFileSupported(filePath: string): boolean {
    return filePath.endsWith('.less');
  }

  version(): string {
    return version.join('.');
  }

  getDistDir() {
    return this.distDir;
  }

  transpileFile(fileContent: string, options: TranspileFileParams): TranspileFileOutput {
    const cssContent = render(fileContent);

    return [
      {
        outputText: cssContent.css.toString(),
        outputPath: this.getDistPathBySrcPath(options.filePath),
      },
    ];
  }

  async build(context: BuildContext): Promise<BuildTaskResult> {
    const results = await Promise.all(
      context.components.map(async (component) => {
        const componentResult = {
          component,
          errors: [],
        };

        await Promise.all(
          component.files
            .filter((file) => {
              return this.isFileSupported(file.path);
            })
            .map(async (file) => {
              try {
                const { css } = await render(file.contents.toString());
                const targetPath = path.join(
                  component.packageDirAbs,
                  this.distDir,
                  this.getDistPathBySrcPath(file.relative)
                );
                await fs.writeFile(targetPath, css);
              } catch (err) {
                componentResult.errors.push(err);
              }
            })
        );

        return componentResult;
      })
    );

    return {
      componentsResults: results,
    };
  }
}
