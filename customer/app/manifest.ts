import type { MetadataRoute } from 'next';

// The customer app already runs a service worker for Web Push; a manifest lets it be installed
// to a home screen and open full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MaxOne',
    short_name: 'MaxOne',
    description: 'Your MaxOne wallet.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAFC',
    theme_color: '#5B45B5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
