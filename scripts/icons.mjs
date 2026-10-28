import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const artwork = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#187d68"/><path d="M256 361C149 295 132 253 143 210c12-48 75-62 113-17 38-45 101-31 113 17 11 43-6 85-113 151Z" fill="none" stroke="#fff" stroke-width="18" stroke-linejoin="round"/><path d="M137 263h68l24-48 34 92 25-44h87" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/></svg>')
await mkdir('public/icons', { recursive: true })
await Promise.all([
  ...[192, 512].map(size => sharp(artwork).resize(size).png().toFile(`public/icons/icon-${size}.png`)),
  sharp(artwork).resize(180).png().toFile('public/icons/apple-touch-icon.png'),
  sharp(artwork).png().toFile('public/icons/icon-maskable.png'),
])