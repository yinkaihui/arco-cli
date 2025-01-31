// eslint-disable-next-line import/no-extraneous-dependencies
import React from 'react';
import { defaultDocs, Docs } from '@arco-cli/docs';
import { ErrorBoundary } from 'react-error-boundary';
import { MDXLayout } from '@arco-cli/ui-foundation-react/dist/markdown/mdxLayout';

interface DocsContentProps {
  docs?: Docs;
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
}

export function Content({ docs = defaultDocs, ...rest }: DocsContentProps) {
  const Content: any = typeof docs.default === 'function' ? docs.default : () => null;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MDXLayout {...rest}>
        <Content />
      </MDXLayout>
    </ErrorBoundary>
  );
}
