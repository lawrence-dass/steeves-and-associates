import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export const metadata: Metadata = {
  title: "Steeves & Associates — Analytics Dashboard",
  description: "Capstone analytics dashboard for ALY6080",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="min-h-screen px-4 pb-24 pt-6 sm:px-6 lg:ml-[250px] lg:pb-8 lg:pt-8">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
