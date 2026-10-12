import type { ComponentChildren, FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

interface WindowProps {
  title: string;
  onClose: () => void;
  initialX: number;
  initialY: number;
  onMove?: (x: number, y: number) => void;
  children: ComponentChildren;
}

// レトロMac風のドラッグ可能な窓コンポーネント
// Why not: react-draggableなどのライブラリではなく自前実装する理由は、依存を最小限にしシンプルな実装で済むため
export const Window: FunctionComponent<WindowProps> = ({
  title,
  onClose,
  initialX,
  initialY,
  onMove,
  children,
}) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // ドラッグ開始
  const handleMouseDown = (e: MouseEvent) => {
    if (!windowRef.current) return;
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  // ドラッグ中
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setPosition({ x: newX, y: newY });
      onMove?.(newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, onMove]);

  return (
    <div
      ref={windowRef}
      class="retro-window fixed"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* タイトルバー: 横縞模様、ドラッグ可能 */}
      <div
        class="retro-window-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        {/* 閉じるボタン: 左上の小さな四角 */}
        <button
          onClick={onClose}
          class="retro-close-button"
          type="button"
          aria-label="Close"
        >
          <span class="sr-only">閉じる</span>
        </button>
        {/* タイトル */}
        <span class="retro-window-title">{title}</span>
      </div>
      {/* ウィンドウ本体 */}
      <div class="retro-window-body">{children}</div>
    </div>
  );
};
