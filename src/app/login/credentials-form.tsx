"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "./actions";

export function CredentialsForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginWithCredentials, null);
  return (
    <form action={action} className="space-y-3 text-left">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="username">Usuario</label><input id="username" name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="input" /></div>
      <div><label className="label" htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
      <button type="submit" disabled={pending} className="btn btn-dark w-full !py-3">{pending ? "Entrando…" : "Entrar"}</button>
      {state?.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
    </form>
  );
}
