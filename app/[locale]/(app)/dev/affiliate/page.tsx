import { AffiliatePreview } from "@/components/affiliate/affiliate-preview";

/** Local review of affiliate picks. The dev layout answers 404 in production. */
export default async function AffiliatePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseId } = await searchParams;
  return <AffiliatePreview caseId={caseId ?? "oily"} />;
}
