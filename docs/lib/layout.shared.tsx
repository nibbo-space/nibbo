import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/BostonLeeK/nibbo',
    nav: {
      title: 'Nibbo',
      url: '/docs',
      transparentMode: 'top',
    },
    themeSwitch: {
      enabled: true,
    },
    links: [
      {
        text: 'nibbo.space',
        url: 'https://nibbo.space',
        external: true,
      },
    ],
  };
}
