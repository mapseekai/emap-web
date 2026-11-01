import type { ReactNode } from 'react';
import ThemedImage from '@theme-original/ThemedImage';
import type { Props } from '@theme/ThemedImage';

const SHARED_LOGO_PATH = '/mapseekai/emap/img/emap.svg';

function sharedLogoPath(source: string): string {
  // The brand asset is shared by every locale, outside localized doc routes.
  return source.startsWith('/') && source.endsWith(SHARED_LOGO_PATH) ? SHARED_LOGO_PATH : source;
}

export default function StaticAssetAwareThemedImage({ sources, ...props }: Props): ReactNode {
  return (
    <ThemedImage
      {...props}
      sources={{ light: sharedLogoPath(sources.light), dark: sharedLogoPath(sources.dark) }}
    />
  );
}
