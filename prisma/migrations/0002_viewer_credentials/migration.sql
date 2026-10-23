-- Rol de solo lectura y cuentas con usuario/contraseña.
ALTER TYPE "Role" ADD VALUE 'VIEWER';

ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
