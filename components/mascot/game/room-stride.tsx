"use client";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import type { GameDress } from "@/lib/mascot/game/look";
import type { BeDaView } from "@/lib/mascot/model";

/**
 * One Bé Da, drawn as feet plus an upright body so the legs can step
 * without tilting or stretching the short sleeves.
 */
export function RoomStride({
  view,
  locale,
  dress,
}: {
  view: BeDaView;
  locale: string;
  dress: GameDress | null;
}) {
  const shared = { view, locale, dress, crowd: true as const, marks: true as const, className: "w-full" };
  return (
    <div className="beda-stride">
      <div className="beda-turn">
        <div className="beda-stride-leg is-l">
          <BeDaFigure {...shared} parts="body" blink={false} />
        </div>
        <div className="beda-stride-leg is-r">
          <BeDaFigure {...shared} parts="body" blink={false} />
        </div>
        <div className="beda-stride-body">
          <BeDaFigure {...shared} parts="body" />
        </div>
        <div className="beda-stride-arms">
          <BeDaFigure {...shared} parts="arms" blink={false} />
        </div>
      </div>
    </div>
  );
}
