import { redirect } from "next/navigation";

// La deuda ahora vive dentro del módulo «Cuentas y deudas».
export default async function DebtRedirect({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ l?: string }> }) {
  const { workspaceId } = await params;
  const { l } = await searchParams;
  redirect(`/w/${workspaceId}/accounts?t=creditos${l ? `&l=${encodeURIComponent(l)}` : ""}`);
}
