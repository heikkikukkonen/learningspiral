import { redirect } from "next/navigation";
import { CaptureComposer } from "@/app/capture/capture-composer";

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams
}: {
  searchParams: { sourceId?: string; mode?: string; shareError?: string; sharedImport?: string };
}) {
  const sourceId = searchParams.sourceId;
  const requestedMode =
    searchParams.mode === "image" || searchParams.mode === "voice" || searchParams.mode === "text"
      ? searchParams.mode
      : "text";
  const shareError =
    searchParams.shareError === "missing-file" || searchParams.shareError === "import-failed"
      ? searchParams.shareError
      : undefined;
  const sharedImportId = searchParams.sharedImport?.trim() || undefined;

  if (sourceId) {
    redirect(`/sources/${sourceId}`);
  }

  return (
    <section className="grid">
      {shareError ? (
        <article className="card">
          <p className="status" style={{ margin: 0 }}>
            {shareError === "missing-file"
              ? "Jaettu sisalto ei tullut mukaan. Kokeile jakaa se uudelleen tai lisaa se manuaalisesti."
              : "Jaetun sisallon tuonti epaonnistui. Voit silti jatkaa tavallisen capture-flow'n kautta."}
          </p>
        </article>
      ) : null}
      <CaptureComposer initialMode={requestedMode} initialSharedImportId={sharedImportId} />
    </section>
  );
}
