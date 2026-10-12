import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { DesktopIcon } from "./DesktopIcon";
import { Window } from "./Window";
import { WorksList, type WorkItem } from "./WorksList";

interface DesktopProps {
  works: WorkItem[];
}

// レトロMac風デスクトップのメインコンポーネント
// Why not: Zustandではなくローカルstateを使う理由は、単一ウィンドウの開閉状態のみでグローバル状態管理が不要なため
export const Desktop: FunctionComponent<DesktopProps> = ({ works }) => {
  const [isWorksOpen, setIsWorksOpen] = useState(false);
  const [worksPosition, setWorksPosition] = useState({ x: 100, y: 80 });

  const openWorks = () => setIsWorksOpen(true);
  const closeWorks = () => setIsWorksOpen(false);
  const handleMove = (x: number, y: number) => setWorksPosition({ x, y });

  return (
    <div class="desktop-container">
      {/* デスクトップアイコンエリア */}
      <div class="desktop-icons">
        <DesktopIcon label="Works" onClick={openWorks} />
      </div>

      {/* Works窓 */}
      {isWorksOpen && (
        <Window
          title="Works"
          onClose={closeWorks}
          initialX={worksPosition.x}
          initialY={worksPosition.y}
          onMove={handleMove}
        >
          <WorksList works={works} />
        </Window>
      )}
    </div>
  );
};
