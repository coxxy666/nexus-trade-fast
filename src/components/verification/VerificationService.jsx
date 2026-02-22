import { appClient } from '@/api/appClient';

// Fee Model Configuration
export const FEE_MODEL = {
  BEP20: {
    swap_fee: 0.3, // 0.3% per swap
    listing_fee: 500, // $500 USD
    verified_discount: 0.1, // 10% discount for verified tokens
  },
  Solana: {
    swap_fee: 0.25, // 0.25% per swap
    listing_fee: 300, // $300 USD
    verified_discount: 0.1, // 10% discount
  }
};

// Verification Criteria Weights
const CRITERIA_WEIGHTS = {
  liquidity_lock: 40, // 40% weight
  contract_audit: 35, // 35% weight
  community_engagement: 25, // 25% weight
};

// Calculate liquidity lock score
const calculateLiquidityScore = (lockData) => {
  if (!lockData?.is_locked) return 0;
  
  const { duration_days = 0, lock_percentage = 0 } = lockData;
  
  // Score based on lock duration
  let durationScore = 0;
  if (duration_days >= 365) durationScore = 100;
  else if (duration_days >= 180) durationScore = 80;
  else if (duration_days >= 90) durationScore = 60;
  else if (duration_days >= 30) durationScore = 40;
  else durationScore = 20;
  
  // Score based on lock percentage
  let percentageScore = 0;
  if (lock_percentage >= 90) percentageScore = 100;
  else if (lock_percentage >= 75) percentageScore = 80;
  else if (lock_percentage >= 50) percentageScore = 60;
  else percentageScore = 40;
  
  return (durationScore + percentageScore) / 2;
};

// Calculate contract audit score
const calculateAuditScore = (auditData) => {
  if (!auditData?.is_audited) return 0;
  
  const { auditor } = auditData;
  
  // Trusted auditors get higher scores
  const trustedAuditors = ['CertiK', 'PeckShield', 'Hacken', 'SlowMist', 'Trail of Bits'];
  if (trustedAuditors.includes(auditor)) return 100;
  
  return 70; // Other auditors
};

// Calculate community engagement score
const calculateCommunityScore = (communityData) => {
  if (!communityData) return 0;
  
  const { holder_count = 0, telegram_members = 0, twitter_followers = 0 } = communityData;
  
  let holderScore = 0;
  if (holder_count >= 10000) holderScore = 100;
  else if (holder_count >= 5000) holderScore = 80;
  else if (holder_count >= 1000) holderScore = 60;
  else if (holder_count >= 500) holderScore = 40;
  else holderScore = 20;
  
  let socialScore = 0;
  const totalSocial = telegram_members + twitter_followers;
  if (totalSocial >= 50000) socialScore = 100;
  else if (totalSocial >= 20000) socialScore = 80;
  else if (totalSocial >= 10000) socialScore = 60;
  else if (totalSocial >= 5000) socialScore = 40;
  else socialScore = 20;
  
  return (holderScore + socialScore) / 2;
};

// Calculate overall verification score
export const calculateVerificationScore = (verificationData) => {
  const liquidityScore = calculateLiquidityScore(verificationData.liquidity_lock);
  const auditScore = calculateAuditScore(verificationData.contract_audit);
  const communityScore = calculateCommunityScore(verificationData.community_metrics);
  
  const totalScore = 
    (liquidityScore * CRITERIA_WEIGHTS.liquidity_lock / 100) +
    (auditScore * CRITERIA_WEIGHTS.contract_audit / 100) +
    (communityScore * CRITERIA_WEIGHTS.community_engagement / 100);
  
  return Math.round(totalScore);
};

// Check if token meets verification criteria
export const meetsVerificationCriteria = (score) => {
  return score >= 70; // Minimum 70/100 to be verified
};

// Verify a token
export const verifyToken = async (tokenSymbol, chain, verificationData) => {
  const score = calculateVerificationScore(verificationData);
  const isVerified = meetsVerificationCriteria(score);
  
  const data = {
    token_symbol: tokenSymbol,
    chain,
    is_verified: isVerified,
    verification_score: score,
    liquidity_lock: verificationData.liquidity_lock,
    contract_audit: verificationData.contract_audit,
    community_metrics: verificationData.community_metrics,
    listing_fee_paid: verificationData.listing_fee_paid || 0,
    verified_at: new Date().toISOString()
  };
  
  // Check if verification exists
  const existing = await appClient.entities.TokenVerification.filter({ token_symbol: tokenSymbol });
  
  if (existing.length > 0) {
    return await appClient.entities.TokenVerification.update(existing[0].id, data);
  }
  
  return await appClient.entities.TokenVerification.create(data);
};

// Get token verification status
export const getTokenVerification = async (tokenSymbol) => {
  const verifications = await appClient.entities.TokenVerification.filter({ token_symbol: tokenSymbol });
  return verifications.length > 0 ? verifications[0] : null;
};

// Calculate swap fee for a transaction
export const calculateSwapFee = (amount, chain, isVerified = false) => {
  const feeConfig = FEE_MODEL[chain];
  if (!feeConfig) return 0;
  
  let feePercentage = feeConfig.swap_fee;
  if (isVerified) {
    feePercentage -= (feePercentage * feeConfig.verified_discount);
  }
  
  return amount * (feePercentage / 100);
};

// Get listing fee for a token
export const getListingFee = (chain, isVerified = false) => {
  const feeConfig = FEE_MODEL[chain];
  if (!feeConfig) return 0;
  
  let fee = feeConfig.listing_fee;
  if (isVerified) {
    fee -= (fee * feeConfig.verified_discount);
  }
  
  return fee;
};
