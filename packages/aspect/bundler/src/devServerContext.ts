import { ExecutionContext } from '@arco-cli/envs';

export interface DevServerContext extends ExecutionContext {
  /**
   * array of files to include.
   */
  entry: string[];

  /**
   * public path.
   */
  publicPath: string;

  /**
   * root path of the workspace.
   */
  rootPath: string;

  /**
   * title of the page.
   */
  title?: string;

  /**
   * favicon of the page.
   */
  favicon?: string;
}
