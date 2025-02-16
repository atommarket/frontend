import { useState } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';

const RPC_ENDPOINT = 'https://rpc.uni.juno.deuslabs.fi';

export function useWallet() {
  const [client, setClient] = useState<SigningCosmWasmClient | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');

  const connect = async () => {
    try {
      await (window as any).keplr.enable('uni-5');
      const offlineSigner = (window as any).keplr.getOfflineSigner('uni-5');
      const client = await SigningCosmWasmClient.connectWithSigner(
        RPC_ENDPOINT,
        offlineSigner,
        { gasPrice: GasPrice.fromString('0.025ujunox') }
      );
      const [account] = await offlineSigner.getAccounts();
      setWalletAddress(account.address);
      setClient(client);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = () => {
    setClient(null);
    setWalletAddress('');
  };

  return { connect, disconnect, walletAddress, client };
} 