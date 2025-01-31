// eslint-disable-next-line import/no-extraneous-dependencies
import React from 'react';
import { Text, Box } from 'ink';
import type { ComponentServer } from '@arco-cli/bundler';

export type PreviewServerRowProps = {
  previewServer: ComponentServer;
  verbose?: boolean;
};

function stringifyIncludedEnvs(includedEnvs: string[] = [], verbose = false) {
  if (includedEnvs.length > 2 && !verbose) return ` ${includedEnvs.length} other envs`;
  return includedEnvs.join(', ');
}

export function PreviewServerRow({ previewServer, verbose }: PreviewServerRowProps) {
  return (
    <Box>
      <Box width="40%">
        <Text color="cyan">
          {previewServer.context.envRuntime.id}
          {previewServer.context.relatedContexts.length &&
          previewServer.context.relatedContexts.length > 1 ? (
            <Text>
              {' '}
              on behalf of {stringifyIncludedEnvs(previewServer.context.relatedContexts, verbose)}
            </Text>
          ) : null}
        </Text>
      </Box>
      <Box width="40%">
        <Text>{`http://localhost:${previewServer.port}`}</Text>
      </Box>
      <Box width="20%">
        <Text color="yellow">RUNNING</Text>
      </Box>
    </Box>
  );
}
