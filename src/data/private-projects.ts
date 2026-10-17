// /private ページに並べる個人プロジェクト一覧
// Why not: works コレクション（src/content/works/）を直接読まないのは、/private だけに
// ステータスを持たせたいため。works のスキーマを変えると /desktop にも影響する。
// 注意: プレビュー URL は誰でも見られるので、秘密情報（非公開 URL・トークン・顧客名など）は書かない。

export type ProjectStatus = "開発中" | "公開中" | "休止中" | "未確認";

export interface PrivateProject {
  name: string;
  description: string;
  url: string;
  status: ProjectStatus;
}

// 名前・説明・リンクは src/content/works/*.md の値をそのまま流用
export const privateProjects: readonly PrivateProject[] = [
  {
    name: "Snapsol",
    description: "写真共有SNSアプリケーション",
    url: "https://github.com/Sol-momma",
    status: "開発中",
  },
  {
    name: "moresta",
    description: "思い出を記録するライフログアプリ",
    url: "https://github.com/Sol-momma",
    status: "未確認",
  },
  {
    name: "YZU Market",
    description: "大学生向けフリーマーケットプラットフォーム",
    url: "https://github.com/Sol-momma",
    status: "開発中",
  },
];
