"use client";

import { useRef } from "react";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { gameDress, genderLook, DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { gameRoomView } from "@/lib/mascot/game/room-view";
import { INTRO_LINE_VI, INTRO_PAGES, type IntroPageId } from "@/lib/mascot/intro";
import { defaultSnapshot, resolveBeDaView, type BeDaGender, type SkinMark } from "@/lib/mascot/model";
import { cn } from "@/lib/utils";

const COPY: Record<
  "vi" | "en",
  {
    hello: string;
    pick: string;
    female: string;
    male: string;
    careTitle: string;
    careBody: string;
    wardrobeTitle: string;
    wardrobeBody: string;
    questsTitle: string;
    questsBody: string;
    lobbyTitle: string;
    lobbyBody: string;
    back: string;
    next: string;
    done: string;
    saving: string;
    retry: string;
  }
> = {
  vi: {
    hello: INTRO_LINE_VI,
    pick: "Bé Da là",
    female: "Nữ",
    male: "Nam",
    careTitle: "Chăm da",
    careBody: "Bé Da dùng đúng routine của mày. Xong bước nào, đánh dấu bước đó.",
    wardrobeTitle: "Tủ đồ",
    wardrobeBody: "Muốn đổi áo, vào Tủ đồ và chọn đồ khác.",
    questsTitle: "Nhiệm vụ",
    questsBody: "Làm nhiệm vụ nhỏ mỗi ngày để Bé Da vui.",
    lobbyTitle: "Sảnh chung",
    lobbyBody: "Vào Sảnh chung để gặp người khác. Chạm một người để xem thẻ nhỏ. Chạm chỗ trống để đóng.",
    back: "Trước",
    next: "Tiếp",
    done: "Đi với Bé Da",
    saving: "Đang lưu…",
    retry: "Chưa lưu được. Thử lại nhé.",
  },
  en: {
    hello: "Bé Da will stay with you. Take good care of them, okay?",
    pick: "Bé Da is",
    female: "Female",
    male: "Male",
    careTitle: "Skin care",
    careBody: "Bé Da follows your real routine. Tick a step when you finish it.",
    wardrobeTitle: "Wardrobe",
    wardrobeBody: "To change clothes, open the wardrobe and pick something else.",
    questsTitle: "Missions",
    questsBody: "Do a small mission each day so Bé Da stays happy.",
    lobbyTitle: "Shared lobby",
    lobbyBody: "Visit the lobby to meet others. Tap someone to see the small card. Tap empty space to close it.",
    back: "Back",
    next: "Next",
    done: "Go to Bé Da",
    saving: "Saving…",
    retry: "Couldn't save. Try again.",
  },
};

export function BeDaIntroScreen({
  locale,
  marks,
  gender,
  page,
  saving = false,
  error = null,
  onGender,
  onPage,
  onFinish,
}: {
  locale: string;
  marks: readonly SkinMark[];
  gender: BeDaGender;
  page: number;
  saving?: boolean;
  error?: string | null;
  onGender: (gender: BeDaGender) => void;
  onPage: (page: number) => void;
  onFinish: () => void;
}) {
  const copy = locale.toLowerCase().startsWith("en") ? COPY.en : COPY.vi;
  const id = INTRO_PAGES[Math.min(INTRO_PAGES.length - 1, Math.max(0, page))] ?? "hello";
  const last = page >= INTRO_PAGES.length - 1;
  const touchX = useRef<number | null>(null);
  const view = gameRoomView(introView(gender, marks));
  const dress = gameDress(genderLook(DEFAULT_GAME_LOOK, gender));

  function go(next: number) {
    onPage(Math.min(INTRO_PAGES.length - 1, Math.max(0, next)));
  }

  return (
    <section
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#fff1f4] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-[#3b2430]"
      data-testid="beda-intro"
      data-page={id}
      data-gender={gender}
      onTouchStart={(event) => {
        touchX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        touchX.current = null;
        if (start == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (delta > 48) go(page - 1);
        if (delta < -48) go(page + 1);
      }}
    >
      <p className="text-center text-sm font-semibold tracking-wide text-[#a85b78]">Bé Da</p>
      <div className="mx-auto mt-2 w-[min(100%,220px)]">
        <BeDaFigure view={view} locale={locale} dress={dress} crowd marks className="w-full" />
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <PageCopy id={id} copy={copy} gender={gender} onGender={onGender} />
        {error ? (
          <p className="mt-3 text-center text-sm text-[#9b3b4a]" role="alert">
            {error || copy.retry}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-center gap-2 py-4" aria-hidden>
          {INTRO_PAGES.map((item, index) => (
            <span
              key={item}
              className={cn("h-2 w-2 rounded-full", index === page ? "bg-[#e07a9a]" : "bg-[#f3c3d1]")}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="min-h-14 rounded-2xl bg-white text-base font-semibold text-[#6d4454] shadow-sm disabled:opacity-40"
            disabled={page === 0 || saving}
            onClick={() => go(page - 1)}
          >
            {copy.back}
          </button>
          {last ? (
            <button
              type="button"
              className="min-h-14 rounded-2xl bg-[#e07a9a] text-base font-bold text-white shadow-sm disabled:opacity-60"
              disabled={saving}
              data-testid="beda-intro-done"
              onClick={onFinish}
            >
              {saving ? copy.saving : copy.done}
            </button>
          ) : (
            <button
              type="button"
              className="min-h-14 rounded-2xl bg-[#e07a9a] text-base font-bold text-white shadow-sm"
              data-testid="beda-intro-next"
              onClick={() => go(page + 1)}
            >
              {copy.next}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function PageCopy({
  id,
  copy,
  gender,
  onGender,
}: {
  id: IntroPageId;
  copy: (typeof COPY)["vi"];
  gender: BeDaGender;
  onGender: (gender: BeDaGender) => void;
}) {
  if (id === "hello") {
    return (
      <div data-testid="beda-intro-hello">
        <p className="text-center text-lg font-medium leading-snug">{copy.hello}</p>
        <p className="mt-5 text-center text-sm font-semibold">{copy.pick}</p>
        <div className="mt-2 grid grid-cols-2 gap-3" role="group" aria-label={copy.pick}>
          <GenderButton selected={gender === "female"} onClick={() => onGender("female")} testId="beda-gender-female">
            {copy.female}
          </GenderButton>
          <GenderButton selected={gender === "male"} onClick={() => onGender("male")} testId="beda-gender-male">
            {copy.male}
          </GenderButton>
        </div>
      </div>
    );
  }
  const body =
    id === "care"
      ? { title: copy.careTitle, text: copy.careBody }
      : id === "wardrobe"
        ? { title: copy.wardrobeTitle, text: copy.wardrobeBody }
        : id === "quests"
          ? { title: copy.questsTitle, text: copy.questsBody }
          : { title: copy.lobbyTitle, text: copy.lobbyBody };
  return (
    <div data-testid={`beda-intro-${id}`}>
      <h1 className="text-center text-2xl font-bold">{body.title}</h1>
      <p className="mt-3 text-center text-base leading-relaxed">{body.text}</p>
    </div>
  );
}

function GenderButton({
  selected,
  onClick,
  testId,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  testId: string;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-testid={testId}
      className={cn(
        "min-h-14 rounded-2xl text-lg font-bold shadow-sm",
        selected ? "bg-[#e07a9a] text-white" : "bg-white text-[#6d4454]",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function introView(gender: BeDaGender, marks: readonly SkinMark[]) {
  const snapshot = {
    ...defaultSnapshot(),
    gender,
    skinMarks: [...marks],
    isDefault: false,
    mood: "happy",
  };
  return resolveBeDaView({
    snapshot,
    missedDays: 0,
    sessionHappy: true,
    locale: "vi",
  });
}
