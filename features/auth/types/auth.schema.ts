import { z } from "zod";

const emailSchema = z.string().trim().email("Ingresá un email válido.").max(254);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
  lastName: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres.").max(80),
  email: emailSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
  phoneNumbers: z.array(z.string().trim().min(8, "Cada teléfono debe tener al menos 8 caracteres.").max(32)).min(1, "Ingresá al menos un teléfono."),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
  lastName: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres.").max(80),
  email: emailSchema,
  phoneNumbers: z.array(z.string().trim().min(8, "Cada teléfono debe tener al menos 8 caracteres.").max(32)).min(1, "Ingresá al menos un teléfono."),
});

export function parsePhoneNumbers(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.split(/[\n,;]/).map((phone) => phone.trim()).filter(Boolean)
    : [];
}

export type AuthActionState = {
  error?: string;
  success?: string;
};