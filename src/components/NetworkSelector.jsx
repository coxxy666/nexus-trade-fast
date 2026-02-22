import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useWallet } from '@/components/WalletContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function NetworkSelector() {
  const { selectedNetwork, switchNetwork, networks, isConnected } = useWallet();
  const currentNetwork = networks[selectedNetwork];

  if (!isConnected) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors border border-white/10 text-sm font-medium">
          <span className="text-lg">{currentNetwork.icon}</span>
          <span className="hidden sm:inline max-w-[100px] truncate">{currentNetwork.name}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-[#1a1a23] border-white/10">
        {Object.entries(networks).map(([key, network]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => switchNetwork(key)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
              selectedNetwork === key
                ? "bg-cyan-500/20 text-cyan-400"
                : "hover:bg-white/5 text-gray-300"
            )}
          >
            <span className="text-lg">{network.icon}</span>
            <div className="flex-1">
              <p className="font-medium">{network.name}</p>
            </div>
            {selectedNetwork === key && (
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
