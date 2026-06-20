"use client";

import { useTranslations } from "next-intl";

import { FeedbackButtons } from "@/components/ui/feedback-buttons";

type StarterRoutineFeedbackProps = {
  profileId: string | null | undefined;
  className?: string;
};

/** Routine feedback — logged-in users only; clearer copy for starter routine. */
export function StarterRoutineFeedback({ profileId, className }: StarterRoutineFeedbackProps) {
  const t = useTranslations("coachWelcome");
  const tFb = useTranslations("feedback");

  if (!profileId) return null;

  return (
    <FeedbackButtons
      targetType="starter_routine"
      targetId={profileId}
      className={className}
      labels={{
        rateTitle: t("feedbackRoutineTitle"),
        rateHint: t("feedbackRoutineHint"),
        rateHintAfterVote: t("feedbackRoutineHintAfter"),
        thanks: t("feedbackThanks"),
        reasonThanks: t("feedbackReasonThanks"),
        helpful: tFb("helpful"),
        notHelpful: tFb("notHelpful"),
        helpfulAria: tFb("helpfulAria"),
        notHelpfulAria: tFb("notHelpfulAria"),
        addReasonCta: tFb("addReasonCta"),
        reasonLabelPos: tFb("reasonLabelPos"),
        reasonLabelNeg: tFb("reasonLabelNeg"),
        reasonPlaceholder: t("feedbackCommentPlaceholder"),
        reasonSend: tFb("reasonSend"),
        dismiss: tFb("dismiss"),
        error: tFb("error"),
        needLogin: tFb("needLogin"),
      }}
      showCommentUpfront
    />
  );
}
