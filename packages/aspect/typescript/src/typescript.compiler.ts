import path from 'path';
import fs from 'fs-extra';
import ts from 'typescript';
import { merge } from 'lodash';
import { Logger } from '@arco-cli/logger';
import { Compiler, TranspileFileOutput, TranspileFileParams } from '@arco-cli/compiler';
import { BuildContext, BuildTaskResult, ComponentResult } from '@arco-cli/builder';
import ArcoError from '@arco-cli/legacy/dist/error/arcoError';
import { DEFAULT_DIST_DIRNAME } from '@arco-cli/legacy/dist/constants';

import { TypescriptCompilerOptions } from './compilerOptions';
import { TsConfigPareFailedError } from './exceptions';
import TypescriptAspect from './typescript.aspect';

const FILENAME_TSCONFIG = 'tsconfig.json';
// const FILENAME_TSCONFIG_BUILD = 'tsconfig.build.json';

export class TypescriptCompiler implements Compiler {
  displayName = 'TypeScript';

  deleteDistDir = false;

  distDir: string;

  shouldCopyNonSupportedFiles: boolean;

  artifactName: string;

  private componentTsConfigMap: Record<string, string> = {};

  constructor(
    readonly id: string,
    private options: TypescriptCompilerOptions,
    private tsModule: typeof ts,
    private logger: Logger
  ) {
    this.distDir = options.distDir || DEFAULT_DIST_DIRNAME;
    this.shouldCopyNonSupportedFiles =
      typeof options.shouldCopyNonSupportedFiles === 'boolean'
        ? options.shouldCopyNonSupportedFiles
        : true;
    this.artifactName = options.artifactName || DEFAULT_DIST_DIRNAME;
    this.options.tsconfig ||= {};
    this.options.tsconfig.compilerOptions ||= {};
  }

  private stringifyTsconfig(tsconfig) {
    return JSON.stringify(tsconfig, undefined, 2);
  }

  private replaceFileExtToJs(filePath: string): string {
    if (!this.isFileSupported(filePath)) return filePath;
    const fileExtension = path.extname(filePath);
    return filePath.replace(new RegExp(`${fileExtension}$`), '.js');
  }

  private getFormatDiagnosticsHost(): ts.FormatDiagnosticsHost {
    return {
      getCanonicalFileName: (p) => p,
      getCurrentDirectory: this.tsModule.sys.getCurrentDirectory,
      getNewLine: () => this.tsModule.sys.newLine,
    };
  }

  private getCacheDir(context: BuildContext) {
    return context.workspace.getCacheDir(TypescriptAspect.id);
  }

  private async writeComponentTsConfig(context: BuildContext) {
    await Promise.all(
      context.components.map(async ({ id: componentId, componentDir, packageDirAbs }) => {
        const tsconfig = this.options.tsconfig;
        merge(tsconfig, {
          include: [componentDir],
          compilerOptions: {
            outDir: this.distDir,
            rootDir: componentDir,
          },
        });

        const tsconfigPath = path.join(packageDirAbs, `${this.distDir}.${FILENAME_TSCONFIG}`);
        this.componentTsConfigMap[componentId] = tsconfigPath;
        await fs.writeFile(tsconfigPath, this.stringifyTsconfig(tsconfig));
      })
    );
  }

  private async writeProjectReferencesTsConfig(context): Promise<string> {
    const cacheDir = this.getCacheDir(context);
    const references = context.components.map((com) => {
      return { path: this.componentTsConfigMap[com.id] || com.packageDirAbs };
    });
    const tsconfig = { files: [], references };
    const tsconfigStr = this.stringifyTsconfig(tsconfig);
    await fs.writeFile(path.join(cacheDir, FILENAME_TSCONFIG), tsconfigStr);
    return cacheDir;
  }

  private async runTscBuild(context: BuildContext): Promise<ComponentResult[]> {
    const { components } = context;

    if (!components.length) {
      return [];
    }

    const componentsResults: ComponentResult[] = [];
    const formatHost = {
      getCanonicalFileName: (p) => p,
      getCurrentDirectory: () => '', // it helps to get the files with absolute paths
      getNewLine: () => this.tsModule.sys.newLine,
    };

    let currentComponentResult: Partial<ComponentResult> = { errors: [] };
    const reportDiagnostic = (diagnostic: ts.Diagnostic) => {
      const errorStr = process.stdout.isTTY
        ? this.tsModule.formatDiagnosticsWithColorAndContext([diagnostic], formatHost)
        : this.tsModule.formatDiagnostic(diagnostic, formatHost);
      if (!diagnostic.file) {
        // the error is general and not related to a specific file. e.g. tsconfig is missing.
        throw new ArcoError(errorStr);
      }
      this.logger.consoleFailure(errorStr);
      if (!currentComponentResult.component || !currentComponentResult.errors) {
        throw new Error(`currentComponentResult is not defined yet for ${diagnostic.file}`);
      }
      currentComponentResult.errors.push(errorStr);
    };

    // this only works when `verbose` is `true` in the `ts.createSolutionBuilder` function.
    const reportSolutionBuilderStatus = (diag: ts.Diagnostic) => {
      const msg = diag.messageText as string;
      this.logger.debug(msg);
    };
    const errorCounter = (errorCount: number) => {
      this.logger.info(`total error found: ${errorCount}`);
    };
    const host = this.tsModule.createSolutionBuilderHost(
      undefined,
      undefined,
      reportDiagnostic,
      reportSolutionBuilderStatus,
      errorCounter
    );

    const rootDir = await this.writeProjectReferencesTsConfig(context);
    const solutionBuilder = this.tsModule.createSolutionBuilder(host, [rootDir], {
      verbose: true,
    });
    const longProcessLogger = this.logger.createLongProcessLogger(
      'compile typescript components',
      components.length
    );

    let nextProject;
    // eslint-disable-next-line no-cond-assign
    while ((nextProject = solutionBuilder.getNextInvalidatedProject())) {
      // nextProject is path of its tsconfig.json
      const packagePath = path.dirname(nextProject.project);
      const component = components.find((com) => com.packageDirAbs === packagePath);
      if (!component) throw new Error(`unable to find component for ${packagePath}`);

      longProcessLogger.logProgress(component.id);
      currentComponentResult.component = component;
      currentComponentResult.startTime = Date.now();
      nextProject.done();
      currentComponentResult.endTime = Date.now();
      componentsResults.push({ ...currentComponentResult } as ComponentResult);
      currentComponentResult = { errors: [] };
    }

    longProcessLogger.end();
    return componentsResults;
  }

  version() {
    return this.tsModule.version;
  }

  displayConfig() {
    return this.stringifyTsconfig(this.options.tsconfig);
  }

  getDistDir() {
    return this.distDir;
  }

  getDistPathBySrcPath(srcPath: string) {
    const fileWithJSExtIfNeeded = this.replaceFileExtToJs(srcPath);
    return path.join(this.distDir, fileWithJSExtIfNeeded);
  }

  isFileSupported(filePath: string): boolean {
    const isJsAndCompile = !!this.options.compileJs && filePath.endsWith('.js');
    const isJsxAndCompile = !!this.options.compileJsx && filePath.endsWith('.jsx');
    return (
      (filePath.endsWith('.ts') ||
        filePath.endsWith('.tsx') ||
        isJsAndCompile ||
        isJsxAndCompile) &&
      !filePath.endsWith('.d.ts')
    );
  }

  transpileFile(fileContent: string, options: TranspileFileParams): TranspileFileOutput {
    if (!this.isFileSupported(options.filePath)) {
      return null;
    }

    const compilerOptionsFromTsconfig = this.tsModule.convertCompilerOptionsFromJson(
      this.options.tsconfig.compilerOptions,
      '.'
    );

    if (compilerOptionsFromTsconfig.errors.length) {
      const formattedErrors = this.tsModule.formatDiagnosticsWithColorAndContext(
        compilerOptionsFromTsconfig.errors,
        this.getFormatDiagnosticsHost()
      );
      throw new TsConfigPareFailedError(`failed parsing the tsconfig.json.\n${formattedErrors}`);
    }

    const compilerOptions = compilerOptionsFromTsconfig.options;
    compilerOptions.sourceRoot = options.componentDir;
    compilerOptions.rootDir = '.';
    const result = this.tsModule.transpileModule(fileContent, {
      compilerOptions,
      fileName: options.filePath,
      reportDiagnostics: true,
    });

    if (result.diagnostics && result.diagnostics.length) {
      const formatHost = this.getFormatDiagnosticsHost();
      const error = this.tsModule.formatDiagnosticsWithColorAndContext(
        result.diagnostics,
        formatHost
      );
      throw new Error(error);
    }

    const outputPath = this.replaceFileExtToJs(options.filePath);
    const outputFiles = [{ outputText: result.outputText, outputPath }];
    if (result.sourceMapText) {
      outputFiles.push({
        outputText: result.sourceMapText,
        outputPath: `${outputPath}.map`,
      });
    }
    return outputFiles;
  }

  async preBuild(context: BuildContext) {
    await this.writeComponentTsConfig(context);
  }

  async build(context: BuildContext): Promise<BuildTaskResult> {
    const componentsResults = await this.runTscBuild(context);
    return {
      componentsResults,
    };
  }
}
