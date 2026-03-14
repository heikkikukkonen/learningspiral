import { redirect } from "next/navigation";
import { CaptureComposer } from "@/app/capture/capture-composer";

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams
}: {
  searchParams: { sourceId?: string; mode?: string };
}) {
  const sourceId = searchParams.sourceId;
  const requestedMode =
    searchParams.mode === "image" || searchParams.mode === "voice" || searchParams.mode === "text"
      ? searchParams.mode
      : "text";

  if (sourceId) {
    redirect(`/sources/${sourceId}`);
  }

  return (
    <section className="grid">
      <CaptureComposer initialMode={requestedMode} />
    </section>
  );
}
