import './globals.css';
import localFont from 'next/font/local';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/svg/logo';

const PontanoSansFont = localFont({
  src: '../public/fonts/Pontano_Sans/PontanoSans-VariableFont_wght.ttf',
  variable: '--font-pontano-sans',
});

const PinyonScriptFont = localFont({
  src: '../public/fonts/Pinyon_Script/PinyonScript-Regular.ttf',
  variable: '--font-pinyon-script',
});

export const metadata: Metadata = {
  title: '404 - Page introuvable | Gossip Club',
  description: 'La page que vous recherchez n\'existe pas.',
};

export default function GlobalNotFound() {
  return (
    <html lang="fr" className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={`${PontanoSansFont.variable} ${PinyonScriptFont.variable} antialiased bg-[oklch(0.145_0_0)] text-[oklch(0.985_0_0)]`}
      >
        <div className="flex flex-col items-center justify-center min-h-dvh px-4 py-8 overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient orbs */}
            <div 
              className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-[100px]"
              style={{ backgroundColor: 'rgba(255, 0, 119, 0.1)' }}
            />
            <div 
              className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-[100px]"
              style={{ backgroundColor: 'rgba(255, 164, 197, 0.1)' }}
            />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px]"
              style={{ backgroundColor: 'rgba(255, 0, 119, 0.05)' }}
            />
          </div>

          <div className="text-center space-y-8 max-w-lg relative z-10">
            {/* Logo with glow effect */}
            <div className="relative">
              <div 
                className="absolute inset-0 blur-2xl rounded-full scale-150"
                style={{ backgroundColor: 'rgba(255, 0, 119, 0.2)' }}
              />
              <Logo 
                className="h-20 mx-auto relative" 
                style={{ 
                  color: '#FF0077',
                  filter: 'drop-shadow(0 0 15px rgba(255, 0, 119, 0.3))'
                }} 
              />
            </div>
            
            {/* 404 Display with gradient */}
            <div className="space-y-4">
              <div className="relative inline-block">
                <h1 
                  className="text-[10rem] font-bold leading-none tracking-tighter select-none"
                  style={{
                    background: 'linear-gradient(to bottom, #FF0077, #FFA4C5, rgba(255, 0, 119, 0.6))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  404
                </h1>
                {/* Reflection effect */}
                <div 
                  className="absolute -bottom-8 left-0 right-0 text-[5rem] font-bold leading-none tracking-tighter blur-sm select-none"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255, 0, 119, 0.3), transparent)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    transform: 'scaleY(-1)',
                    opacity: 0.3,
                  }}
                >
                  404
                </div>
              </div>
              
              <h2 className="text-lg pt-2" style={{ color: 'oklch(0.708 0 0)' }}>
                Page introuvable
              </h2>
            </div>
            
            {/* Action button */}
            <Link 
              href="/home"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor: '#FF0077',
                boxShadow: '0 10px 25px -5px rgba(255, 0, 119, 0.25)',
              }}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Accueil
            </Link>
          </div>

          {/* Bottom decorative line */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(255, 0, 119, 0.3), transparent)',
            }}
          />
        </div>
      </body>
    </html>
  );
}
