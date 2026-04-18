import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "原型托管平台",
  description: "上传 · 预览 · 分享你的 HTML 原型",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
