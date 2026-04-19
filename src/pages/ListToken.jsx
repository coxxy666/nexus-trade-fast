import React from 'react'
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import CreateTokenPanel from '@/components/tokens/CreateTokenPanel';

export default function ListToken() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Coins className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">Create Meme Token</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Launch standard Solana SPL or BNB Chain BEP20 meme tokens with SaveMeme attribution.
          </p>
        </motion.div>

        <CreateTokenPanel />
      </div>
    </div>
  );
}
