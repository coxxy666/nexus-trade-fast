import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { appClient } from '@/api/appClient';

export default function NFTHoldings() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    collection_name: '',
    token_id: '',
    image_url: '',
    floor_price: ''
  });

  const queryClient = useQueryClient();

  const { data: nfts = [] } = useQuery({
    queryKey: ['nftHoldings'],
    queryFn: () => appClient.entities.NFTHolding.list()
  });

  const createNFT = useMutation({
    mutationFn: (data) => appClient.entities.NFTHolding.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['nftHoldings']);
      setFormData({ collection_name: '', token_id: '', image_url: '', floor_price: '' });
      setShowAddModal(false);
    }
  });

  const deleteNFT = useMutation({
    mutationFn: (id) => appClient.entities.NFTHolding.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['nftHoldings'])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createNFT.mutate({
      ...formData,
      floor_price: formData.floor_price ? parseFloat(formData.floor_price) : 0
    });
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Image className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">NFT Holdings</h3>
            <p className="text-gray-400 text-sm">{nfts.length} items</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add NFT
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {nfts.map((nft, index) => (
          <motion.div
            key={nft.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="group relative glass-card rounded-xl overflow-hidden hover:border-pink-500/30 transition-all"
          >
            <div className="aspect-square bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center">
              {nft.image_url ? (
                <img src={nft.image_url} alt={nft.collection_name} className="w-full h-full object-cover" />
              ) : (
                <Image className="w-12 h-12 text-gray-600" />
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm truncate">{nft.collection_name}</p>
              <p className="text-xs text-gray-500">#{nft.token_id}</p>
              {nft.floor_price > 0 && (
                <p className="text-xs text-cyan-400 mt-1">Floor: {nft.floor_price} ETH</p>
              )}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-black/50 hover:bg-black/70"
                onClick={() => deleteNFT.mutate(nft.id)}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </Button>
            </div>
          </motion.div>
        ))}
        
        {nfts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Image className="w-16 h-16 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No NFTs added yet</p>
          </div>
        )}
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Add NFT to Portfolio</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Collection Name</Label>
              <Input
                placeholder="e.g., Bored Ape Yacht Club"
                value={formData.collection_name}
                onChange={(e) => setFormData({ ...formData, collection_name: e.target.value })}
                className="bg-white/5 border-white/10 mt-1"
                required
              />
            </div>

            <div>
              <Label>Token ID</Label>
              <Input
                placeholder="e.g., 1234"
                value={formData.token_id}
                onChange={(e) => setFormData({ ...formData, token_id: e.target.value })}
                className="bg-white/5 border-white/10 mt-1"
                required
              />
            </div>

            <div>
              <Label>Image URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-white/5 border-white/10 mt-1"
              />
            </div>

            <div>
              <Label>Floor Price (ETH)</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={formData.floor_price}
                onChange={(e) => setFormData({ ...formData, floor_price: e.target.value })}
                className="bg-white/5 border-white/10 mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
                disabled={createNFT.isPending}
              >
                {createNFT.isPending ? 'Adding...' : 'Add NFT'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
