import { createServerFn } from "@tanstack/react-start";

export const mailDurumuAl = createServerFn({ method: "GET" }).handler(
  async () => {
    const hazir = Boolean(
      process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_MAIL_API_KEY"],
    );
    return { hazir };
  },
);
