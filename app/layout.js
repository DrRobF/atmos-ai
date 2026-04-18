export const metadata = {
  title: "Atmos AI",
  description: "Build your atmosphere",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <style>{`
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: clip;
            background: #f5ecdf;
            color: #342d28;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
          }
        `}</style>
      </body>
    </html>
  );
}
