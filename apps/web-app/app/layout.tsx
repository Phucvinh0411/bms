import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast'
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";
import { AuthProvider } from "@/src/auth/context";
import { ChatWidget } from "@/src/ai-chat/components/ChatWidget";

export const metadata: Metadata = {
  title: "BookHaven – Quản lý sách",
  description: "Nơi lưu giữ những cuốn sách hay. Quản lý, tìm kiếm và khám phá bộ sưu tập sách của bạn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#f6f5f3] font-sans text-gray-900 flex flex-col">
        <Toaster position="top-right" />
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
