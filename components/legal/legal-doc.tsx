import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

type LegalDocProps = {
  kind: "privacy" | "terms";
};

const PRIVACY_SECTIONS = ["collect", "photos", "retention", "choices", "medical"] as const;
const TERMS_SECTIONS = ["product", "account", "payments", "medical", "changes"] as const;

/** Minimal, honest legal pages — no invented certifications or retention promises. */
export async function LegalDoc({ kind }: LegalDocProps) {
  const t = await getTranslations(`legal.${kind}`);
  const tFooter = await getTranslations("common.footer");
  const sections = kind === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const otherHref = kind === "privacy" ? "/terms" : "/privacy";
  const otherLabel = kind === "privacy" ? tFooter("terms") : tFooter("privacy");

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/85">
        DaDiary
      </p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">{t("updated")}</p>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("intro")}
      </p>

      <div className="mt-8 space-y-6">
        {sections.map((key) => (
          <section key={key} className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{t(`${key}.title`)}</h2>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {t(`${key}.body`)}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-pretty text-sm leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link
          href={otherHref}
          className="font-medium text-primary underline underline-offset-4"
        >
          {otherLabel}
        </Link>
        <span aria-hidden className="px-1.5">
          ·
        </span>
        <Link href="/" className="font-medium text-primary underline underline-offset-4">
          {t("homeLink")}
        </Link>
      </p>
    </article>
  );
}
