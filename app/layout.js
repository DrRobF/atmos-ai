export const metadata = {
  title: "Atmos AI",
  description: "Build your atmosphere",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
