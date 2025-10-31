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
  Image,
  HStack,
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { SearchIcon, MoonIcon, SunIcon, AddIcon } from '@chakra-ui/icons';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateListingModal from './components/CreateListingModal';
import CreateProfileModal from './components/CreateProfileModal';
import ViewProfileModal from './components/ViewProfileModal';
import ListingGrid from './components/ListingGrid';
import ListingPage from './pages/ListingPage';
import { useListing } from './hooks/useListing';
import logo from './assets/logo.png';

declare global {
  interface Window extends KeplrWindow {}
}

const CONTRACT_ADDRESS = 'cosmos1m6re27fmzy8l9zsy3d2rflvrmsfgy8qyznaj3lx3grlwsuf8ryesvgmrl9';

// Chain configuration for Cosmos Hub
const chainConfig = {
  chainId: 'cosmoshub-4',
  chainName: 'Cosmos Hub',
  rpc: 'https://rpc.cosmoshub.strange.love',
  rest: 'https://api.cosmoshub.strange.love',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'cosmos',
    bech32PrefixAccPub: 'cosmospub',
    bech32PrefixValAddr: 'cosmosvaloper',
    bech32PrefixValPub: 'cosmosvaloperpub',
    bech32PrefixConsAddr: 'cosmosvalcons',
    bech32PrefixConsPub: 'cosmosvalconspub',
  },
  currencies: [
    {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'ATOM',
    coinMinimalDenom: 'uatom',
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
}: { 
  client: SigningCosmWasmClient | null;
  walletAddress: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const { listings, fetchListings, searchListingsByTitle } = useListing(client, CONTRACT_ADDRESS);

  // Initial fetch of listings
  useEffect(() => {
    if (client) {
      fetchListings();
    }
  }, [client, fetchListings]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchListingsByTitle(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchListingsByTitle]);

  return (
    <VStack spacing={8} align="stretch">
      <Box>
        <InputGroup size="lg" mb={6}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search listings by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

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
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const { isOpen: isListingModalOpen, onOpen: onListingModalOpen, onClose: onListingModalClose } = useDisclosure();
  const { isOpen: isProfileModalOpen, onOpen: onProfileModalOpen, onClose: onProfileModalClose } = useDisclosure();
  const { isOpen: isViewProfileOpen, onOpen: onViewProfileOpen, onClose: onViewProfileClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

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

  const checkProfile = async () => {
    if (!client || !walletAddress) return;
    try {
      const response = await client.queryContractSmart(CONTRACT_ADDRESS, {
        profile: { address: walletAddress }
      });
      setHasProfile(!!response.profile);
    } catch (error) {
      console.error('Error checking profile:', error);
      setHasProfile(false);
    }
  };

  useEffect(() => {
    if (client && walletAddress) {
      checkProfile();
    }
  }, [client, walletAddress]);

  return (
    <Router>
      <Container maxW="container.xl" py={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
          <HStack spacing={4}>
            <Image src={logo} alt="ATOM Market Logo" height="60px" />
            <Heading size="2xl">ATOM Market</Heading>
          </HStack>
          <HStack spacing={4}>
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
            />
            {walletAddress ? (
              <>
                <Text>Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}</Text>
                <Button colorScheme="blue" onClick={onListingModalOpen} leftIcon={<AddIcon />}>
                  Create Listing
                </Button>
                {hasProfile ? (
                  <Button colorScheme="blue" onClick={onViewProfileOpen}>
                    View Profile
                  </Button>
                ) : (
                  <Button colorScheme="green" onClick={onProfileModalOpen}>
                    Create Profile
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={connectWallet}>Connect Keplr</Button>
            )}
          </HStack>
        </Box>

        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                client={client}
                walletAddress={walletAddress}
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
          isOpen={isListingModalOpen}
          onClose={onListingModalClose}
          client={client}
          contractAddress={CONTRACT_ADDRESS}
          walletAddress={walletAddress}
          onSuccess={() => {
            onListingModalClose();
            window.location.reload();
          }}
        />

        <CreateProfileModal
          isOpen={isProfileModalOpen}
          onClose={onProfileModalClose}
          client={client}
          contractAddress={CONTRACT_ADDRESS}
          walletAddress={walletAddress}
          onSuccess={() => {
            onProfileModalClose();
            checkProfile();
          }}
        />

        <ViewProfileModal
          isOpen={isViewProfileOpen}
          onClose={onViewProfileClose}
          client={client}
          contractAddress={CONTRACT_ADDRESS}
          walletAddress={walletAddress}
          onProfileDeleted={() => {
            setHasProfile(false);
          }}
        />
      </Container>
    </Router>
  );
} 