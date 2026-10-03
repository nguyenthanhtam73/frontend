import { FACEBOOK_PROFILE_URL, TIKTOK_PROFILE_URL } from "@/lib/seo";

export const DELETE_ACCOUNT_STEP_KEYS = ["s1", "s2", "s3", "s4"] as const;

export type DeleteAccountCopy = {
  title: string;
  intro: string;
  stepsTitle: string;
  steps: readonly string[];
  deletedTitle: string;
  deletedBody: string;
  keptTitle: string;
  keptBody: string;
  undo: string;
  cantSignInTitle: string;
  cantSignInBody: string;
  privacyLink: string;
  homeLink: string;
  facebookLabel: string;
  tiktokLabel: string;
};

type DeleteAccountDocProps = {
  copy: DeleteAccountCopy;
  privacyHref: string;
  homeHref: string;
};

const linkClass = "font-medium text-primary underline underline-offset-4";

/** Public help article. No session check — anyone can read it. */
export function DeleteAccountDoc({ copy, privacyHref, homeHref }: DeleteAccountDocProps) {
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
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{copy.deletedTitle}</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{copy.deletedBody}</p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{copy.keptTitle}</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{copy.keptBody}</p>
      </section>

      <p className="mt-6 text-pretty text-sm leading-relaxed text-muted-foreground">{copy.undo}</p>

      <section className="mt-8 space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{copy.cantSignInTitle}</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{copy.cantSignInBody}</p>
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
