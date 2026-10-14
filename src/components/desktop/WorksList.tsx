import type { FunctionComponent } from "preact";

export interface WorkItem {
  title: string;
  description: string;
  url?: string;
}

interface WorksListProps {
  works: WorkItem[];
}

// Works窓の中に表示する作品リスト。
// JSX の型は tsconfig の jsxImportSource: preact で解決する。
// Why not: any / as any で黙らせない理由は、a / 見出しなどの属性誤りを型で検出したいため
// Why not: カード風の複雑なUIではなくリスト表示にする理由は、レトロMacのシンプルな美学に合わせるため
export const WorksList: FunctionComponent<WorksListProps> = ({ works }) => {
  return (
    <div class="works-list">
      {works.map((work) => (
        <div key={work.title} class="work-item">
          <h3 class="work-title">{work.title}</h3>
          <p class="work-description">{work.description}</p>
          {work.url && (
            <a
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              class="work-link"
            >
              View →
            </a>
          )}
        </div>
      ))}
    </div>
  );
};
