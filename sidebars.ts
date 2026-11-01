import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: '入门教程',
      collapsed: false,
      items: ['getting-started/installation', 'getting-started/quick-start'],
    },
    {
      type: 'category',
      label: '操作指南',
      link: { type: 'doc', id: 'guides/index' },
      items: [
        {
          type: 'category',
          label: '地图与显示',
          items: [
            'guides/camera',
            'recipes/fit-bounds',
            'guides/styling',
            'guides/controls',
            'recipes/status-control',
          ],
        },
        {
          type: 'category',
          label: '交互与编辑',
          items: [
            'guides/events',
            'guides/selection',
            'guides/editing',
            'recipes/undo-redo',
            'recipes/error-handling',
          ],
        },
        {
          type: 'category',
          label: '数据处理',
          items: [
            'data/formats',
            'recipes/file-upload',
            'data/attributes',
            'data/operations',
            'data/geotiff',
            'data/geopackage',
            'data/duckdb',
          ],
        },
        {
          type: 'category',
          label: '集成与性能',
          items: ['guides/plugins', 'guides/worker', 'recipes/performance'],
        },
      ],
    },
    {
      type: 'category',
      label: '概念说明',
      items: [
        'concepts/overview',
        'concepts/emap',
        'concepts/source-layer',
        'concepts/coordinates-crs',
        'concepts/topology',
        'concepts/runtime',
        'concepts/architecture',
      ],
    },
    {
      type: 'category',
      label: '参考手册',
      link: { type: 'doc', id: 'reference/index' },
      items: ['reference/events', 'reference/errors', 'reference/compatibility', 'reference/faq'],
    },
  ],
};

export default sidebars;
