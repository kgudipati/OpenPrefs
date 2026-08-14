import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

/** Static metadata for the integration example. */
export const metadata: Metadata = {
  title: "OpenPrefs settings example",
  description: "Natural-language and conventional controls over one settings store.",
};

/** Renders the minimal document shell shared by the example settings page and route. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
