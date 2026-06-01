import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VQueryBuilder",
  description:
    "A visual, schema-driven SQL query builder — design tables, joins, conditions and projections graphically.",
};

// Prevent a flash of the wrong theme before hydration.
const themeScript = `(function(){try{var t=localStorage.getItem('vqb-theme');var d=t? t==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark', d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
