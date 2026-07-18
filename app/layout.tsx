import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDUNGA — Panel nauczyciela",
  description: "Kiedy logika spotyka wyobraźnię.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  );
}