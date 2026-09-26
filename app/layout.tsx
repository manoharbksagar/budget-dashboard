import type { Metadata } from "next";
import { Noto_Sans_Kannada } from "next/font/google";
import "./globals.css";
import AppNavigation from "@/components/navigation/AppNavigation";

const kannada = Noto_Sans_Kannada({
  variable: "--font-kannada",
  subsets: ["kannada"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ಅನುದಾನ ಬಿಡುಗಡೆ ಮತ್ತು ವೆಚ್ಚ ನಿರ್ವಹಣಾ ವ್ಯವಸ್ಥೆ",
  description:
    "Budget, expense and reporting application for district administration",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="kn"
      className={`${kannada.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <AppNavigation />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
