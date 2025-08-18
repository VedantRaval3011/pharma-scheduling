import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { MasterDataProvider } from "@/context/MasterDataContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Multi-Role Auth App",
  description:
    "Authentication system with Super Admin, Admin, and Employee roles",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <MasterDataProvider>
            {children}
          </MasterDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
