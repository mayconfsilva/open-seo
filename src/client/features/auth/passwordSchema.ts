import { z } from "zod";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";

export const passwordSchema = z
  .string()
  .min(
    HOSTED_PASSWORD_MIN_LENGTH,
    `A senha precisa ter pelo menos ${HOSTED_PASSWORD_MIN_LENGTH} caracteres.`,
  )
  .max(
    HOSTED_PASSWORD_MAX_LENGTH,
    `A senha pode ter no máximo ${HOSTED_PASSWORD_MAX_LENGTH} caracteres.`,
  );
