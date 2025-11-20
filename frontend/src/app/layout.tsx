import FloatingHelpButton from "./components/FloatingHelpButton";
import "./globals.css";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
      >
        {children}
        <FloatingHelpButton />
      </body>
    </html>
  );
}


