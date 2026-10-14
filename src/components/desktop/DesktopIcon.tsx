import type { FunctionComponent } from "preact";

interface DesktopIconProps {
  label: string;
  onClick: () => void;
}

// デスクトップに表示するアイコン。
// JSX の型は tsconfig の jsxImportSource: preact で解決する。
// Why not: any / as any で黙らせない理由は、button / svg の属性誤りを型で検出したいため
// Why not: FontAwesomeなど外部アイコンライブラリではなくCSS/SVGで自作する理由は、ライセンスとバンドルサイズの最小化
export const DesktopIcon: FunctionComponent<DesktopIconProps> = ({
  label,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      class="flex flex-col items-center gap-2 p-2 hover:bg-black/10 focus:outline-none focus:bg-black/10 transition-colors"
      type="button"
    >
      {/* アイコン本体: 四角いフォルダ風のシンプルなSVG */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="retro-icon"
      >
        <rect x="8" y="16" width="32" height="24" stroke="black" stroke-width="2" fill="white" />
        <path d="M8 16 L20 16 L24 12 L40 12 L40 16" stroke="black" stroke-width="2" fill="white" />
      </svg>
      {/* ラベル */}
      <span class="text-sm font-bold text-black select-none">{label}</span>
    </button>
  );
};
