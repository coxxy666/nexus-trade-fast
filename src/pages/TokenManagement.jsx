import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Plus, Search, CheckCircle, XCircle, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AddTokenModal from '@/components/tokens/AddTokenModal';

export default function TokenManagement() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Check if user is admin
  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await appClient.auth.me();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
    };
    checkUser();
  }, []);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => appClient.entities.Token.list('-created_date'),
  });

  const toggleListingMutation = useMutation({
    mutationFn: ({ id, is_listed }) => 
      appClient.entities.Token.update(id, { is_listed: !is_listed }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tokens']);
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (id) => appClient.entities.Token.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tokens']);
    },
  });

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(search.toLowerCase()) ||
    token.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Token <span className="gradient-text">Management</span>
              </h1>
              <p className="text-gray-400">
                {isAdmin ? 'Manage tokens available in swap and pools' : 'Add custom tokens to your account'}
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Token
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mb-8 glow-cyan"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Total Tokens</p>
              <p className="text-2xl font-bold">{tokens.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Listed</p>
              <p className="text-2xl font-bold text-green-400">
                {tokens.filter(t => t.is_listed).length}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Delisted</p>
              <p className="text-2xl font-bold text-red-400">
                {tokens.filter(t => !t.is_listed).length}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Custom Tokens</p>
              <p className="text-2xl font-bold text-purple-400">
                {tokens.filter(t => t.is_custom).length}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
            />
          </div>
        </motion.div>

        {/* Tokens List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="space-y-2">
            {filteredTokens.map((token, index) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={token.logo_url || `https://ui-avatars.com/api/?name=${token.symbol}&background=random`}
                    alt={token.symbol}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{token.symbol}</p>
                      {token.is_custom && (
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                          Custom
                        </Badge>
                      )}
                      {token.is_listed ? (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Listed
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Delisted
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{token.name}</p>
                    {token.contract_address && (
                      <p className="text-gray-500 text-xs font-mono mt-1">
                        {token.contract_address.slice(0, 6)}...{token.contract_address.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="font-semibold">
                      ${token.price_usd?.toLocaleString() || '0.00'}
                    </p>
                    <p className={cn(
                      "text-sm",
                      (token.change_24h || 0) >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {(token.change_24h || 0) >= 0 ? '+' : ''}{token.change_24h?.toFixed(2) || '0.00'}%
                    </p>
                  </div>

                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleListingMutation.mutate({ id: token.id, is_listed: token.is_listed })}
                        className={cn(
                          "border-white/20 rounded-lg",
                          token.is_listed ? "hover:bg-red-500/10" : "hover:bg-green-500/10"
                        )}
                      >
                        {token.is_listed ? 'Delist' : 'List'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTokenMutation.mutate(token.id)}
                        className="text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredTokens.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No tokens found
            </div>
          )}
        </motion.div>

        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 glass-card rounded-xl p-4 border border-yellow-500/30"
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-400 font-medium">Admin Access Required</p>
                <p className="text-xs text-gray-400 mt-1">
                  Only administrators can list/delist tokens and delete them. You can add custom tokens for your own use.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <AddTokenModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      </div>
    </div>
  );
}
