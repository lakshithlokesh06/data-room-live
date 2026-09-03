import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataRoom Live",
  description: "Collaborative data quality review for modern data teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
