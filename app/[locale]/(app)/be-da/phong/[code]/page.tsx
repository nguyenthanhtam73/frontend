import { getTranslations } from "next-intl/server";

import { BeDaGameGate } from "@/components/mascot/game/be-da-game-gate";
import { pageLocaleMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; code: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.beDa" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/be-da",
    noIndex: true,
  });
}

/** Invite link. The room itself joins in the browser. No server fetch. */
export default async function BeDaSpaRoomPage({ params }: Props) {
  const { code } = await params;
  return <BeDaGameGate roomCode={code} />;
}
