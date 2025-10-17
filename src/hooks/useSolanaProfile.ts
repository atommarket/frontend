import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaProgram } from './useSolanaProgram';
import { deriveProfilePda, PROGRAM_ID } from '../config/solana';

export interface SolanaProfile {
  owner: string;
  profileName: string;
  transactionCount: number;
  ratings: number;
  ratingCount: number;
  averageRating: number;
}

export function useSolanaProfile() {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState<SolanaProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (userPubkey: PublicKey) => {
    if (!program) return null;
    
    setLoading(true);
    try {
      const [profilePda] = deriveProfilePda(userPubkey, PROGRAM_ID);
      const profileAccount = await (program.account as any).profile.fetch(profilePda);
      
      const profileData: SolanaProfile = {
        owner: profileAccount.owner.toString(),
        profileName: profileAccount.profileName,
        transactionCount: profileAccount.transactionCount.toNumber(),
        ratings: profileAccount.ratings.toNumber(),
        ratingCount: profileAccount.ratingCount.toNumber(),
        averageRating: profileAccount.averageRating.toNumber(),
      };
      
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [program]);

  const createProfile = useCallback(async (profileName: string) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    const [profilePda] = deriveProfilePda(publicKey, PROGRAM_ID);

    const tx = await (program as any).methods
      .createProfile(profileName)
      .accounts({
        profile: profilePda,
        user: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, publicKey]);

  return { profile, fetchProfile, createProfile, loading };
}

