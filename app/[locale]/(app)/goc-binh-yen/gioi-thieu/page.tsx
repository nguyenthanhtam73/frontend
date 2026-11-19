import type { Metadata } from "next";

import { BeDaIntroRoute } from "@/components/mascot/intro/be-da-intro-route";
import { gameWebViewViewport } from "@/lib/game/webview-viewport";

export const viewport = gameWebViewViewport;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Bé Da",
};

/** Intro for Bé Da. Same login session as the game. The token stays out of the URL. */
export default function GocBinhYenIntroPage() {
  return <BeDaIntroRoute />;
}
