import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { auth } from "@/lib/auth/config";
import { acceptInvite } from "@/modules/core/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitación" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await auth())?.user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const res = await acceptInvite(token);
  if ("workspaceId" in res) redirect(`/w/${res.workspaceId}`);
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
      <section className="card space-y-4 text-center">
        <div className="flex justify-center"><Logo height={30} /></div>
        <h1 className="text-xl font-semibold">No pudimos aceptar la invitación</h1>
        <p className="text-muted">{res.error}</p>
        <Link href="/" className="btn btn-primary">Ir al inicio</Link>
      </section>
    </main>
  );
}
