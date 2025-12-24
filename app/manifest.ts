import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EddieU AI - 영어일기·작문·스피킹',
    short_name: 'EddieU AI',
    description: 'AI가 아이의 영어 일기를 따뜻하고 정확하게 첨삭해줍니다. 손글씨 사진으로도 가능하고, 스피킹 연습과 펜팔까지!',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}


