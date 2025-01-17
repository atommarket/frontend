import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  useDisclosure,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
} from '@chakra-ui/react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { SearchIcon } from '@chakra-ui/icons';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateListingModal from './components/CreateListingModal';
import ListingGrid from './components/ListingGrid';
import ListingPage from './pages/ListingPage';
import { useListing } from './hooks/useListing';

declare global {
  interface Window extends KeplrWindow {}
}

const CONTRACT_ADDRESS = 'juno1fucsaa4mukx86z5sfxm3k3445eh8c4vcpejzu93457wufh4s6zms4qz6ra';

// Chain configuration for Juno
const chainConfig = {
  chainId: 'juno-1',
  chainName: 'Juno',
  rpc: 'https://rpc-juno.itastakers.com',
  rest: 'https://lcd-juno.itastakers.com',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'juno',
    bech32PrefixAccPub: 'junopub',
    bech32PrefixValAddr: 'junovaloper',
    bech32PrefixValPub: 'junovaloperpub',
    bech32PrefixConsAddr: 'junovalcons',
    bech32PrefixConsPub: 'junovalconspub',
  },
  currencies: [
    {
      coinDenom: 'JUNO',
      coinMinimalDenom: 'ujuno',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'JUNO',
      coinMinimalDenom: 'ujuno',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'JUNO',
    coinMinimalDenom: 'ujuno',
    coinDecimals: 6,
  },
  gasPriceStep: {
    low: 0.01,
    average: 0.025,
    high: 0.04,
  },
};

function HomePage({ 
  client, 
  walletAddress, 
  onCreateListing 
}: { 
  client: SigningCosmWasmClient | null;
  walletAddress: string;
  onCreateListing: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const { listings, fetchListings, searchListings } = useListing(client, CONTRACT_ADDRESS);

  // Initial fetch of listings
  useEffect(() => {
    if (client) {
      fetchListings();
    }
  }, [client]);

  // Handle search with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      fetchListings();
      return;
    }

    const timer = setTimeout(() => {
      searchListings(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <VStack spacing={8} align="stretch">
      <Box>
        <InputGroup size="lg" mb={6}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

      {walletAddress && (
        <Button colorScheme="blue" onClick={onCreateListing}>
          Create New Listing
        </Button>
      )}

      <ListingGrid
        listings={listings}
        client={client}
        contractAddress={CONTRACT_ADDRESS}
        walletAddress={walletAddress}
        onRefresh={fetchListings}
      />
    </VStack>
  );
}

export default function App() {
  const [client, setClient] = useState<SigningCosmWasmClient | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const connectWallet = async () => {
    if (!window.keplr) {
      alert('Please install Keplr extension');
      return;
    }

    try {
      // Suggest the chain to Keplr
      await window.keplr.experimentalSuggestChain(chainConfig);
      
      // Enable the chain
      await window.keplr.enable(chainConfig.chainId);
      
      // Get the offline signer
      const offlineSigner = window.keplr.getOfflineSigner(chainConfig.chainId);
      
      // Create the client
      const client = await SigningCosmWasmClient.connectWithSigner(
        chainConfig.rpc,
        offlineSigner
      );
      
      // Get the user's address
      const [{ address }] = await offlineSigner.getAccounts();
      
      setClient(client);
      setWalletAddress(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + (error as Error).message);
    }
  };

  return (
    <Router>
      <Container maxW="container.xl" py={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
          <Heading>Julian Marketplace</Heading>
          {walletAddress ? (
            <Text>Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}</Text>
          ) : (
            <Button onClick={connectWallet}>Connect Keplr</Button>
          )}
        </Box>

        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                client={client}
                walletAddress={walletAddress}
                onCreateListing={onOpen}
              />
            } 
          />
          <Route 
            path="/listing/:id" 
            element={
              <ListingPage
                client={client}
                contractAddress={CONTRACT_ADDRESS}
                walletAddress={walletAddress}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <CreateListingModal
          isOpen={isOpen}
          onClose={onClose}
          client={client}
          contractAddress={CONTRACT_ADDRESS}
          walletAddress={walletAddress}
          onSuccess={() => {
            onClose();
            window.location.reload();
          }}
        />
      </Container>
    </Router>
  );
} 