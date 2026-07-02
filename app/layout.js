import './globals.css';

export const metadata = {
  title: 'Click Laudos — Pesquisas CSAT/NPS',
  description: 'Gestão de pesquisas de satisfação (CSAT/NPS) da Click Laudos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
