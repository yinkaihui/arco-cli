import { UIRoot } from '@arco-cli/ui';
import { FILE_WORKSPACE_JSONC } from '@arco-cli/legacy/dist/constants';
import { Workspace } from './workspace';

export class WorkspaceUiRoot implements UIRoot {
  constructor(private workspace: Workspace) {}

  buildOptions = {
    ssr: false,
    launchBrowserOnStart: true,
  };

  get name() {
    return this.workspace.name;
  }

  get path() {
    return this.workspace.path;
  }

  get configFile() {
    return FILE_WORKSPACE_JSONC;
  }

  getConfig() {
    return {};
  }

  async resolveAspects(runtimeName: string) {
    return this.workspace.resolveAspects(runtimeName);
  }
}
