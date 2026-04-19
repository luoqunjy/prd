import "./globals.css";
import { Toaster } from "sonner";
import { Mascot } from "@/components/Mascot";

export const metadata = {
  title: "原型托管平台 · 团小满陪你",
  description: "上传 · 预览 · 分享你的 HTML 原型",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster position="top-center" richColors />
        <Mascot />
      </body>
    </html>
  );
}
