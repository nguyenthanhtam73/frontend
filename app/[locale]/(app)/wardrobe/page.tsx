import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

/** Legacy route: fashion wardrobe → skincare cabinet. */
export default async function WardrobeRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/cabinet", locale });
}
