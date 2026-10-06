import { SUPPORT_EMAIL } from "@/lib/config";
import { FACEBOOK_PROFILE_URL, TIKTOK_PROFILE_URL } from "@/lib/seo";

export const DELETE_ACCOUNT_STEP_KEYS = ["s1", "s2", "s3", "s4"] as const;

export type DeleteAccountCopy = {
  title: string;
  intro: string;
  stepsTitle: string;
  steps: readonly string[];
  deletedTitle: string;
  deletedBody: string;
  /** Active Premium ends with the account and is not refunded. */
  premium: string;
  /** Visible label inside step 2. The word itself is the /settings link. */
  settingsLink: string;
  keptTitle: string;
  /** Edit these two lines in messages `legal.deleteAccount.retention`. */
  retentionPayments: string;
  retentionStats: string;
  undo: string;
  cantSignInTitle: string;
  cantSignInBody: string;
  cantSignInAlso: string;
  privacyLink: string;
  homeLink: string;
  facebookLabel: string;
  tiktokLabel: string;
};

type DeleteAccountDocProps = {
  copy: DeleteAccountCopy;
  privacyHref: string;
  homeHref: string;
  settingsHref: string;
};

function stepWithSettingsLink(step: string, label: string, href: string) {
  const at = step.indexOf(label);
  if (at < 0) return step;
  return (
    <>
      {step.slice(0, at)}
      <a href={href} className={linkClass}>
        {label}
      </a>
      {step.slice(at + label.length)}
    </>
  );
}

const linkClass = "font-medium text-primary underline underline-offset-4";

/** Public help article. No session check — anyone can read it. */
export function DeleteAccountDoc({
  copy,
  privacyHref,
  homeHref,
  settingsHref,
}: DeleteAccountDocProps) {
  return (
    <article
      data-testid="delete-account-page"
      className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/85">
        DaDiary
      </p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        {copy.intro}
      </p>

      <section className="mt-8 space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{copy.stepsTitle}</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-pretty text-sm leading-relaxed text-muted-foreground">
          {copy.steps.map((step) => (
            <li key={step}>{stepWithSettingsLink(step, copy.settingsLink, settingsHref)}</li>
          ))}
        </ol>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{copy.deletedTitle}</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{copy.deletedBody}</p>
        <p
          data-testid="delete-account-premium"
          className="text-pretty text-sm leading-relaxed text-muted-foreground"
        >
          {copy.premium}
        </p>
      </section>

      {/*
        Google Play asks how long kept data is stored.
        Edit only messages vi/en `legal.deleteAccount.retention`.
      */}
      <section
        className="mt-6 space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4"
        data-retention-block="kept-data"
        aria-labelledby="delete-account-retention"
      >
        <h2 id="delete-account-retention" className="text-base font-semibold tracking-tight">
          {copy.keptTitle}
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-pretty text-sm leading-relaxed text-muted-foreground">
          <li>{copy.retentionPayments}</li>
          <li>{copy.retentionStats}</li>
        </ul>
      </section>

      <p className="mt-6 text-pretty text-sm leading-relaxed text-muted-foreground">{copy.undo}</p>

      <section className="mt-8 space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{copy.cantSignInTitle}</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{copy.cantSignInBody}</p>
        <p className="text-sm text-muted-foreground">
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{copy.cantSignInAlso}</p>
        <p className="text-sm text-muted-foreground">
          <a href={FACEBOOK_PROFILE_URL} className={linkClass}>
            {copy.facebookLabel}
          </a>
          <span aria-hidden className="px-1.5">
            ·
          </span>
          <a href={TIKTOK_PROFILE_URL} className={linkClass}>
            {copy.tiktokLabel}
          </a>
        </p>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        <a href={privacyHref} className={linkClass}>
          {copy.privacyLink}
        </a>
        <span aria-hidden className="px-1.5">
          ·
        </span>
        <a href={homeHref} className={linkClass}>
          {copy.homeLink}
        </a>
      </p>
    </article>
  );
}
