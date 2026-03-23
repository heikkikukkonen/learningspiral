import { NextResponse } from "next/server";
import {
  deleteSharedImageImport,
  getSharedImageImport
} from "@/lib/shared-capture-imports";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Shared image import failed.";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(
  _request: Request,
  { params }: { params: { importId: string } }
) {
  try {
    const sharedImport = await getSharedImageImport(params.importId);

    if (!sharedImport) {
      return NextResponse.json({ error: "Shared image import not found." }, { status: 404 });
    }

    return NextResponse.json(sharedImport);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { importId: string } }
) {
  try {
    await deleteSharedImageImport(params.importId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
