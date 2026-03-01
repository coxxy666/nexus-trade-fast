import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { useWallet } from './WalletContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function WalletButton({ compact = false }) {
  const { account, walletType, isConnecting, connectWallet, disconnectWallet, formatAddress } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const hasInjectedEvm =
    typeof window !== 'undefined' && (
      (window.ethereum && typeof window.ethereum.request === 'function') ||
      (window.BinanceChain && typeof window.BinanceChain.request === 'function')
    );
  const evmConnectType = isMobile ? 'walletconnect' : (hasInjectedEvm ? 'bnb' : 'walletconnect');

  const handleConnect = (type, walletName = null) => {
    connectWallet(type, walletName);
    setShowWalletModal(false);
  };

  if (account) {
    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={`bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white border-0 rounded-xl font-medium ${compact ? 'px-3' : 'px-4'}`}>
            <Wallet className="w-4 h-4 mr-2" />
            {compact ? 'Wallet' : formatAddress(account)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#12121a] border-white/10 text-white">
          <div className="px-2 py-1.5 text-xs text-gray-400">
            {walletType === 'solana' ? 'Solana' : 'EVM Wallet'}
          </div>
          <DropdownMenuItem onClick={disconnectWallet} className="cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button 
        type="button"
        onClick={() => {
          if (!isConnecting) setShowWalletModal(true);
        }}
        className={`relative z-[80] pointer-events-auto touch-manipulation bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white border-0 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${compact ? 'px-3' : 'px-6'}`}
      >
        {isConnecting ? 'Connecting...' : (compact ? 'Connect' : 'Connect Wallet')}
      </Button>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="z-[120] bg-[#12121a] border-white/10 text-white w-[95vw] max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <button
              onClick={() => handleConnect('solana', 'phantom')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-cyan-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Phantom Wallet</p>
                <p className="text-xs text-gray-400">Connect to Solana network</p>
              </div>
            </button>

            <button
              onClick={() => handleConnect('solana', 'solflare')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-cyan-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Solflare Wallet</p>
                <p className="text-xs text-gray-400">Connect to Solana network</p>
              </div>
            </button>

            <button
              onClick={() => handleConnect(evmConnectType, 'Binance Web3')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-yellow-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Binance Web3</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain</p>
              </div>
            </button>

            <button
              onClick={() => handleConnect(evmConnectType, 'MetaMask')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-yellow-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">MetaMask</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain / Ethereum Smart Chain</p>
              </div>
            </button>

            <button
              onClick={() => handleConnect(evmConnectType, 'Trust Wallet')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-yellow-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Trust Wallet</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain / Ethereum Smart Chain</p>
              </div>
            </button>

            <button
              onClick={() => handleConnect(evmConnectType, 'Ethereum')}
              className="w-full p-4 rounded-xl border-2 border-white/10 hover:border-blue-500/30 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Ethereum Wallet</p>
                <p className="text-xs text-gray-400">Connect to BNB Smart Chain / Ethereum Smart Chain</p>
              </div>
            </button>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

