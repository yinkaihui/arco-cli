import chalk from 'chalk';
import { Logger } from '@arco-cli/logger';
import { Workspace } from '@arco-cli/workspace';
import { WorkspaceNotFoundError } from '@arco-cli/workspace/dist/exceptions';
import { Command, CommandOptions } from '@arco-cli/legacy/dist/cli/command';
import { CLI_COMPONENT_PATTERN_HELP } from '@arco-cli/legacy/dist/constants';

import { BuilderMain } from './builder.main.runtime';

type BuildOpts = {
  skipTests?: boolean;
};

export class BuilderCmd implements Command {
  name = 'build [component-pattern]';

  description = 'run set of tasks for build';

  arguments = [{ name: 'component-pattern', description: CLI_COMPONENT_PATTERN_HELP }];

  alias = '';

  group = 'development';

  options = [
    ['', 'skip-tests', 'skip running component tests during build process'],
  ] as CommandOptions;

  constructor(private builder: BuilderMain, private workspace: Workspace, private logger: Logger) {}

  async report([pattern]: [string], { skipTests }: BuildOpts): Promise<string> {
    if (!this.workspace) throw new WorkspaceNotFoundError();

    const longProcessLogger = this.logger.createLongProcessLogger('build');
    const components = await this.workspace.getManyByPattern(pattern);
    if (!components.length) {
      return chalk.bold('no components found to build');
    }

    this.logger.consoleSuccess(`found ${components.length} components to build`);
    const envsExecutionResults = await this.builder.build(components, {
      skipTests,
    });
    longProcessLogger.end();
    envsExecutionResults.throwErrorsIfExist();
    this.logger.consoleSuccess();
    return chalk.green(
      `the build has been completed. total: ${envsExecutionResults.tasksQueue.length} tasks`
    );
  }
}
