import { Component } from '@arco-cli/component';
import { BuildContext } from '@arco-cli/builder';

export type LibraryOptions = {
  /**
   * Specify a name for the library
   */
  name: string;

  /**
   * Configure how the library will be exposed
   * could be values like: 'umd', 'umd2', 'amd', 'commonjs',
   */
  type?: string;
};

export type Chunking = {
  /**
   * include all types of chunks (async / non-async) in splitting
   */
  splitChunks: boolean;
};

export type MetaData = {
  /**
   * Who initiate the bundling process
   */
  initiator?: string;
  /**
   * Env id (used usually to calculate the config)
   */
  envId?: string;
};

export type HtmlConfig = {
  /**
   * The title to use for the generated HTML document
   */
  title: string;
  /**
   * The file to write the HTML to. Defaults to index.html
   */
  filename?: string;
  /**
   * Allows you to add only some chunks (e.g only the unit-test chunk)
   */
  chunks?: string[];
  /**
   * Load chunks according to their order in the `chunks` array
   * @default auto
   */
  chunkOrder?: 'auto' | 'manual';
  /**
   * provide an inline template
   */
  templateContent: string;
  /**
   * Controls if and in what ways the output should be minified
   */
  minify?: boolean;

  /**
   * The favicon for the html page
   */
  favicon?: string;
};

export type Entry = {
  /**
   * Specifies the name of each output file on disk
   */
  filename: string;
  /**
   * Module(s) that are loaded upon startup
   */
  import: string | string[];

  /**
   * Specify library options to bundle a library from current entry
   */
  library?: LibraryOptions;
};

export type EntryMap = {
  [entryName: string]: Entry;
};

export type ModuleTarget = {
  /**
   * name of the module.
   */
  name: string;

  /**
   * module exposes.
   */
  exposes: {
    [internalPath: string]: string;
  };

  shared: {
    [key: string]: any;
  };
};

export type Target = {
  /**
   * entries of the target.
   */
  entries: string[] | EntryMap;

  /**
   * array of components included in the target.
   */
  components: Component[];

  /**
   * output path of the target
   */
  outputPath: string;

  /**
   * This option determines the name of each output bundle
   */
  filename?: string;

  /**
   * This option determines the name of non-initial chunk files
   */
  chunkFilename?: string;

  /**
   * Whether to run compression by the bundler
   */
  compress?: boolean;

  /**
   * List of peer dependencies
   */
  peers?: string[];

  /**
   * config for html generation
   */
  html?: HtmlConfig[];

  /**
   * module targets to expose.
   */
  modules?: ModuleTarget[];

  /**
   * Name for the runtime chunk
   */
  runtimeChunkName?: string;

  /**
   * Different configuration related to chunking
   */
  chunking?: Chunking;

  /**
   * A path for the host root dir
   * Host root dir is usually the env root dir
   * This can be used in different bundle options which run require.resolve
   * for example when configuring webpack aliases or webpack expose loader on the peers deps
   */
  hostRootDir?: string;
};

export interface BundlerContext extends BuildContext {
  /**
   * all components about to be build
   */
  components: Component[];

  /**
   * targets for bundling.
   */
  targets: Target[];

  /**
   * determines whether it is a production build, default is `true`.
   * in development, expect the bundler to favour debugging on the expanse of optimization.
   */
  development?: boolean;

  /**
   * public path output of the bundle.
   */
  publicPath?: string;

  /**
   * root path
   */
  rootPath?: string;

  /**
   * Whether to run compression by the bundler
   */
  compress?: boolean;

  /**
   * config for html generation for all targets
   */
  html?: HtmlConfig[];

  /**
   * modules for bundle to expose. used by module federation at webpack, or with different methods applied by various bundlers.
   */
  modules?: {
    name: string;
    fileName: string;
    exposes: { [key: string]: string };
  };

  /**
   * Additional info that can be used by the bundler for different stuff like logging info
   */
  metaData?: MetaData;
}
