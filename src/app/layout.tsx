import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuessMate Admin",
  description: "Custom character guessing game engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">GuessMate</span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">Admin</span>
        </nav>
        <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
