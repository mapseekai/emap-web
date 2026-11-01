import useBaseUrl from '@docusaurus/useBaseUrl';

type Props = {
  name: 'architecture' | 'data-model' | 'source-preflight' | 'shared-arcs';
  language: 'zh' | 'en';
  alt: string;
};

export default function DocsDiagram({ name, language, alt }: Props) {
  const src = useBaseUrl(`/img/diagrams/${name}-${language}.svg`);

  return (
    <>
      <figure
        className="docs-diagram"
        role="region"
        aria-label={language === 'zh' ? '可横向滚动的图示' : 'Horizontally scrollable diagram'}
        tabIndex={0}
      >
        <img src={src} alt={alt} loading="lazy" />
      </figure>
      <p className="docs-diagram-hint">
        {language === 'zh' ? '左右滑动或使用方向键查看完整图示。' : 'Scroll horizontally or use arrow keys to see the full diagram.'}
      </p>
    </>
  );
}
