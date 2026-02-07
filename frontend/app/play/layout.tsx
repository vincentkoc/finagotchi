import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "finagotchi",
  description: "memory-aware finance agent with tamagotchi UX",
};

export default function PlayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
