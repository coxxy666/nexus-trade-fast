import React, { useState } from 'react';
import { Coins, ArrowRight, CheckCircle, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { appClient } from '@/api/appClient';
import { verifyToken, FEE_MODEL } from '@/components/verification/VerificationService';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ListToken() {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    chain: 'BEP20',
    liquidity_locked: false,
    lock_duration_days: 0,
    lock_percentage: 0,
    is_audited: false,
    auditor: '',
    audit_date: '',
    audit_report_url: '',
    holder_count: 0,
    telegram_members: 0,
    twitter_followers: 0,
  });
  
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const verificationData = {
        liquidity_lock: {
          is_locked: formData.liquidity_locked,
          duration_days: Number(formData.lock_duration_days),
          lock_percentage: Number(formData.lock_percentage),
        },
        contract_audit: {
          is_audited: formData.is_audited,
          auditor: formData.auditor,
          audit_date: formData.audit_date,
          audit_report_url: formData.audit_report_url,
        },
        community_metrics: {
          holder_count: Number(formData.holder_count),
          telegram_members: Number(formData.telegram_members),
          twitter_followers: Number(formData.twitter_followers),
        },
        listing_fee_paid: FEE_MODEL[formData.chain].listing_fee,
      };
      
      const verification = await verifyToken(formData.symbol, formData.chain, verificationData);
      
      toast.success(
        verification.is_verified 
          ? `${formData.symbol} verified successfully!` 
          : `${formData.symbol} submitted but doesn't meet verification criteria`
      );
      
      // Reset form
      setFormData({
        symbol: '',
        name: '',
        chain: 'BEP20',
        liquidity_locked: false,
        lock_duration_days: 0,
        lock_percentage: 0,
        is_audited: false,
        auditor: '',
        audit_date: '',
        audit_report_url: '',
        holder_count: 0,
        telegram_members: 0,
        twitter_followers: 0,
      });
    } catch (error) {
      toast.error('Failed to submit token for verification');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const listingFee = FEE_MODEL[formData.chain].listing_fee;
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Coins className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">List Your Token</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Submit your memecoin for verification and listing on Meme Market DEX
          </p>
        </motion.div>
        
        {/* Fee Model */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4 text-cyan-400">BEP20 (BSC)</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Listing Fee</span>
                <span className="font-bold">${FEE_MODEL.BEP20.listing_fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Swap Fee</span>
                <span className="font-bold">{FEE_MODEL.BEP20.swap_fee}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Verified Discount</span>
                <span className="font-bold text-green-400">{FEE_MODEL.BEP20.verified_discount * 100}%</span>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4 text-purple-400">Solana</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Listing Fee</span>
                <span className="font-bold">${FEE_MODEL.Solana.listing_fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Swap Fee</span>
                <span className="font-bold">{FEE_MODEL.Solana.swap_fee}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Verified Discount</span>
                <span className="font-bold text-green-400">{FEE_MODEL.Solana.verified_discount * 100}%</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Listing Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="glass-card rounded-3xl p-8 border border-white/10 space-y-6"
        >
          <h2 className="text-2xl font-bold mb-6">Token Information</h2>
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="symbol">Token Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                placeholder="DOGE"
                required
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="chain">Blockchain *</Label>
              <select
                id="chain"
                value={formData.chain}
                onChange={(e) => setFormData({...formData, chain: e.target.value})}
                className="w-full mt-2 h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                required
              >
                <option value="BEP20">BEP20 (BSC)</option>
                <option value="Solana">Solana</option>
              </select>
            </div>
          </div>
          
          {/* Liquidity Lock */}
          <div className="p-4 rounded-xl bg-white/5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Liquidity Lock (40% weight)
            </h3>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="liquidity_locked"
                checked={formData.liquidity_locked}
                onChange={(e) => setFormData({...formData, liquidity_locked: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="liquidity_locked">Liquidity is locked</Label>
            </div>
            
            {formData.liquidity_locked && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lock_duration_days">Lock Duration (days)</Label>
                  <Input
                    id="lock_duration_days"
                    type="number"
                    value={formData.lock_duration_days}
                    onChange={(e) => setFormData({...formData, lock_duration_days: e.target.value})}
                    placeholder="365"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lock_percentage">Lock Percentage (%)</Label>
                  <Input
                    id="lock_percentage"
                    type="number"
                    value={formData.lock_percentage}
                    onChange={(e) => setFormData({...formData, lock_percentage: e.target.value})}
                    placeholder="90"
                    max="100"
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Contract Audit */}
          <div className="p-4 rounded-xl bg-white/5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              Contract Audit (35% weight)
            </h3>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_audited"
                checked={formData.is_audited}
                onChange={(e) => setFormData({...formData, is_audited: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="is_audited">Contract is audited</Label>
            </div>
            
            {formData.is_audited && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="auditor">Auditor Name</Label>
                  <Input
                    id="auditor"
                    value={formData.auditor}
                    onChange={(e) => setFormData({...formData, auditor: e.target.value})}
                    placeholder="CertiK, PeckShield, etc."
                    className="mt-2"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="audit_date">Audit Date</Label>
                    <Input
                      id="audit_date"
                      type="date"
                      value={formData.audit_date}
                      onChange={(e) => setFormData({...formData, audit_date: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="audit_report_url">Audit Report URL</Label>
                    <Input
                      id="audit_report_url"
                      type="url"
                      value={formData.audit_report_url}
                      onChange={(e) => setFormData({...formData, audit_report_url: e.target.value})}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Community Engagement */}
          <div className="p-4 rounded-xl bg-white/5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-400" />
              Community Engagement (25% weight)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="holder_count">Holder Count</Label>
                <Input
                  id="holder_count"
                  type="number"
                  value={formData.holder_count}
                  onChange={(e) => setFormData({...formData, holder_count: e.target.value})}
                  placeholder="1000"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="telegram_members">Telegram Members</Label>
                <Input
                  id="telegram_members"
                  type="number"
                  value={formData.telegram_members}
                  onChange={(e) => setFormData({...formData, telegram_members: e.target.value})}
                  placeholder="5000"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="twitter_followers">Twitter Followers</Label>
                <Input
                  id="twitter_followers"
                  type="number"
                  value={formData.twitter_followers}
                  onChange={(e) => setFormData({...formData, twitter_followers: e.target.value})}
                  placeholder="10000"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-cyan-300">
              <p className="font-semibold mb-1">Verification Criteria</p>
              <p>Tokens need a minimum score of 70/100 to receive the Verified badge. Verified tokens get a 10% discount on swap fees.</p>
            </div>
          </div>
          
          {/* Submit */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <div>
              <p className="text-sm text-gray-400">Listing Fee</p>
              <p className="text-2xl font-bold gradient-text">${listingFee} USD</p>
            </div>
            
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 px-8 py-6 text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit for Verification'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
