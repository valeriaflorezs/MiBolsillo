// Las cuentas con usuario/contraseña no tienen correo real: se les asigna uno reservado (TLD .invalid, nunca enrutable).
export const CRED_DOMAIN = "@credenciales.invalid";
export const credentialEmail = (username: string) => `${username}${CRED_DOMAIN}`;
