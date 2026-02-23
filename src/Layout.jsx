import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
  ArrowLeftRight, 
  Droplets, 
  BarChart3, 
  Shield,
  Zap,
  Menu, 
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import WalletButton from '@/components/WalletButton';
import { WalletProvider } from '@/components/WalletContext';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', icon: BarChart3, page: 'Home' },
    { name: 'Swap', icon: ArrowLeftRight, page: 'Swap' },
    { name: 'Pools', icon: Droplets, page: 'Pools' },
    { name: 'MemeAI', icon: Shield, page: 'MemeAI' },
  ];

  return (
    <WalletProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
      <style>{`
        :root {
          --accent-cyan: #00D4FF;
          --accent-purple: #7B61FF;
          --accent-pink: #FF61DC;
        }
        
        .gradient-text {
            background: linear-gradient(135deg, #00D4FF 0%, #0080FF 50%, #7B61FF 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .glow-cyan {
          box-shadow: 0 0 40px rgba(0, 212, 255, 0.15);
        }
        
        .glow-purple {
          box-shadow: 0 0 40px rgba(123, 97, 255, 0.15);
        }
        
        .nav-active {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(123, 97, 255, 0.1) 100%);
          border-color: rgba(0, 212, 255, 0.3);
        }
        
        .bg-mesh {
          background-image: 
            radial-gradient(at 40% 20%, rgba(123, 97, 255, 0.08) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(0, 212, 255, 0.06) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(255, 97, 220, 0.05) 0px, transparent 50%),
            radial-gradient(at 80% 80%, rgba(123, 97, 255, 0.05) 0px, transparent 50%);
        }
      `}</style>

      {/* Background mesh gradient */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                <img
                  src="/save-meme-logo.png?v=2"
                  alt="SAVE MEME"
                  className="w-full h-full object-contain object-center"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/save-meme-logo.svg';
                  }}
                />
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    currentPageName === item.page
                      ? "nav-active text-cyan-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Network & Wallet Controls */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <WalletButton />
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-card border-t border-white/5">
            <div className="px-4 pt-4 pb-2 sm:hidden">
              <WalletButton />
            </div>
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPageName === item.page
                      ? "nav-active text-cyan-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative pt-20 min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative glass-card border-t border-white/5 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/save-meme-logo.png?v=2"
                alt="SAVE MEME"
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/save-meme-logo.svg';
                }}
              />
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 DOLPHIN AI MEME MARKET. AI-Powered Meme Token Protection.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </WalletProvider>
  );
}
