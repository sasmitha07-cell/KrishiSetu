import "./globals.css";

export const metadata = {
  title: "KrishiSetu | Interoperable Open Agriculture Network (DPG)",
  description: "Digital Public Good connecting Indian smallholder farmers with state agricultural nodes, package-of-practices grounded RAG, regenerative crop recommendations, leaf disease diagnostics, and DEPA consent architecture.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  );
}
