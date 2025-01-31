// eslint-disable-next-line import/no-extraneous-dependencies
import React, { ComponentType, useEffect, useState } from 'react';
import { Text, Newline } from 'ink';
import { UIServerLoader } from './uiServerLoader';
import type { UIServer } from '../uiServer';

export type UIServerConsoleProps = {
  /**
   * future of the ui server.
   */
  futureUiServer: Promise<UIServer>;

  /**
   * name of the app.
   */
  appName?: string;

  /**
   * explicit server url
   */
  url?: string;
};

export function UIServerConsole({ appName, futureUiServer, url }: UIServerConsoleProps) {
  const [uiServer, setUiServer] = useState<UIServer>();
  const [plugins, setPlugins] = useState<ComponentType[]>();

  useEffect(() => {
    futureUiServer
      .then((server) => {
        setUiServer(server);
        setPlugins(server.getPluginsComponents());
      })
      .catch((err) => {
        throw err;
      });
  }, []);

  if (!uiServer) return <UIServerLoader name={appName} />;

  return (
    <>
      {plugins?.map((Plugin, key) => {
        return <Plugin key={key} />;
      })}
      <Newline />
      <Text>
        You can now view [<Text color="cyan">{uiServer?.getName()}</Text>] components in the
        browser.
      </Text>
      <Text>Arco dev server is running on {url || uiServer.fullUrl}</Text>
    </>
  );
}
