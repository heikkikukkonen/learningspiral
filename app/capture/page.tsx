import { redirect } from "next/navigation";
import { CaptureComposer } from "@/app/capture/capture-composer";

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams
}: {
  searchParams: { sourceId?: string; mode?: string; shareError?: string };
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

  if (sourceId) {
    redirect(`/sources/${sourceId}`);
  }

  return (
    <section className="grid">
      {shareError ? (
        <article className="card">
          <p className="status" style={{ margin: 0 }}>
            {shareError === "missing-file"
              ? "Jaettu kuva ei tullut mukaan. Kokeile jakaa kuva uudelleen tai valitse se manuaalisesti."
              : "Jaetun kuvan tuonti epaonnistui. Voit silti jatkaa tavallisen image capture -flow'n kautta."}
          </p>
        </article>
      ) : null}
      <CaptureComposer initialMode={requestedMode} />
    </section>
  );
}
