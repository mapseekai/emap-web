import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Emap',
  tagline: 'Topology-oriented browser maps',
  url: 'https://mapseekai.github.io',
  baseUrl: '/mapseekai/emap/',
  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'icon', href: '/mapseekai/emap/img/emap.svg' },
    },
  ],
  organizationName: 'mapseekai',
  projectName: 'emap',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['zh', 'en'],
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en'],
    localeConfigs: {
      'zh-CN': {
        label: '简体中文',
      },
      en: {
        label: 'English',
      },
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: { hideable: true },
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 3,
    },
    navbar: {
      title: 'Emap',
      logo: {
        alt: 'Emap logo',
        src: '/mapseekai/emap/img/emap.svg',
        srcDark: '/mapseekai/emap/img/emap.svg',
        width: 22,
        height: 22,
      },
      items: [
        {
          to: '/getting-started/quick-start',
          activeBaseRegex: '/getting-started/',
          position: 'left',
          label: '快速入门',
        },
        {
          to: '/guides/',
          activeBaseRegex: '/(guides|recipes|data)(/|$)',
          position: 'left',
          label: '操作指南',
        },
        {
          to: '/concepts/overview',
          activeBaseRegex: '/concepts/',
          position: 'left',
          label: '核心概念',
        },
        {
          to: '/reference/',
          activeBaseRegex: '/reference/',
          position: 'left',
          label: '参考手册',
        },
        {
          href: 'pathname:///mapseekai/emap/examples/',
          autoAddBaseUrl: false,
          label: '示例',
          position: 'left',
        },
        {
          href: 'pathname:///mapseekai/emap/api/',
          autoAddBaseUrl: false,
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://github.com/mapseekai/emap',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: '文档',
          items: [
            { label: '快速入门', to: '/getting-started/quick-start' },
            { label: '操作指南', to: '/guides/' },
            { label: '核心概念', to: '/concepts/overview' },
            { label: '参考手册', to: '/reference/' },
          ],
        },
        {
          title: '资源',
          items: [
            { label: '可运行示例', href: 'pathname:///mapseekai/emap/examples/' },
            { label: 'TypeDoc API', href: 'pathname:///mapseekai/emap/api/' },
            { label: 'GitHub 仓库', href: 'https://github.com/mapseekai/emap' },
          ],
        },
        {
          title: '生态与依赖',
          items: [
            { label: 'Mapshaper', href: 'https://github.com/mbloch/mapshaper' },
            { label: 'DuckDB-Wasm', href: 'https://github.com/duckdb/duckdb-wasm' },
            { label: 'Cordis', href: 'https://github.com/cordiverse/cordis' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Mapseek AI. Built with Docusaurus.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
