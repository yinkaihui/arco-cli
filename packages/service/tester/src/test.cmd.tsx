// eslint-disable-next-line import/no-extraneous-dependencies
import React from 'react';
import { Box, Text } from 'ink';
import { Logger } from '@arco-cli/logger';
import { Command, CommandOptions } from '@arco-cli/legacy/dist/cli/command';
import { Timer } from '@arco-cli/legacy/dist/utils/timer';
import { Workspace } from '@arco-cli/workspace';
import { TesterMain } from './tester.main.runtime';

type TestFlags = {
  watch: boolean;
};

export class TestCmd implements Command {
  name = 'test';

  description = 'test components in the workspace';

  alias = 'at';

  group = 'development';

  options = [['w', 'watch', 'start the tester in watch mode.']] as CommandOptions;

  constructor(private tester: TesterMain, private logger: Logger, private workspace: Workspace) {}

  async render(_, { watch }: TestFlags) {
    this.logger.console(`testing components in workspace in workspace`);

    const timer = Timer.create();
    timer.start();

    const components = await this.workspace.list();
    const testResults = await this.tester.test(components, { watch });
    const code = testResults.hasErrors() ? 1 : 0;
    const { seconds } = timer.stop();

    return {
      code,
      data: (
        <Box>
          <Text>Test has been completed in</Text>
          <Text color="cyan">{seconds}</Text>
          <Text>seconds.</Text>
        </Box>
      ),
    };
  }
}
