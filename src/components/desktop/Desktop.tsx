import type { FunctionComponent } from "preact";

// レトロMac風デスクトップのメインコンポーネント。
// JSX の型は tsconfig の jsxImportSource: preact で解決する。
// Works 窓（作品一覧）は公開準備ができるまで出さない（壮宇さんの判断）ため、
// アイコン・窓・作品データをバンドルに含めないよう取り除いている。
// Why not: CSS で隠すだけにしない理由は、HTML と JS に作品データが残ってしまうため
export const Desktop: FunctionComponent = () => {
  return (
    <div class="desktop-container">
      {/* デスクトップアイコンエリア（今は空。今後アイコンを足すときの置き場） */}
      <div class="desktop-icons"></div>
    </div>
  );
};
