import { useState, useCallback } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';

export interface Profile {
  profile_name: string;
  transaction_count: number;
  ratings: number;
  rating_count: number;
  average_rating: number;
}

export function useProfile(client: SigningCosmWasmClient | null, contractAddress: string) {
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (address: string) => {
    if (!client) return null;
    try {
      const response = await client.queryContractSmart(contractAddress, {
        profile: { address }
      });
      if (response.profile) {
        setProfile(response.profile);
        return response.profile;
      }
      setProfile(null);
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    }
  }, [client, contractAddress]);

  const deleteProfile = useCallback(async (walletAddress: string) => {
    if (!client) throw new Error('Client not connected');
    
    return await client.execute(
      walletAddress,
      contractAddress,
      { delete_profile: {} },
      {
        amount: [],
        gas: "500000",
      }
    );
  }, [client, contractAddress]);

  return { profile, fetchProfile, deleteProfile };
} 