import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "找搭子 · 出游计划匹配",
  description: "通过时间、地点和出游计划，找到合适的出行搭子。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
