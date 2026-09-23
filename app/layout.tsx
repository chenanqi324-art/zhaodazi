import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "找搭子 V2 · 发现适合你的出游计划",
  description: "通过偏好推荐、同行可信信息和出发确认，找到合适的出行搭子并真正成行。",
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
