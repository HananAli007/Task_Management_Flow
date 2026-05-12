import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { ClientLayout } from "@/components/ClientLayout";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProjectFlow | Industry Standard Task Management",
  description: "Manage your projects like a pro with ProjectFlow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
