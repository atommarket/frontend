import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Image,
  Spinner,
  useToast,
  IconButton,
  Badge,
  Heading,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useColorModeValue,
} from '@chakra-ui/react';
import { ArrowBackIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Listing } from '../hooks/useListing';
import { useListing } from '../hooks/useListing';
import { useIPFS } from '../hooks/useIPFS';

interface ImageMetadata {
  images: {
    cid: string;
    url: string;
  }[];
}

interface ListingPageProps {
  client: SigningCosmWasmClient | null;
  contractAddress: string;
  walletAddress: string;
}

export default function ListingPage({ client, contractAddress, walletAddress }: ListingPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const { deleteListing } = useListing(client, contractAddress);
  const { unpinFile } = useIPFS();
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchListing = async () => {
      if (!client || !id) return;
      try {
        const response = await client.queryContractSmart(contractAddress, {
          listing: { listing_id: parseInt(id) }
        });
        console.log('Listing response:', response);
        console.log('Wallet address:', walletAddress);
        console.log('Is seller?', walletAddress === response.listing.seller);
        
        if (response && response.listing && typeof response.listing === 'object') {
          const processedListing = {
            ...response.listing,
            tags: response.listing.tags || [],
          };
          setListing(processedListing);
          console.log('Processed listing:', processedListing);

          if (processedListing.external_id) {
            const imageResponse = await fetch(processedListing.external_id);
            const metadata: ImageMetadata = await imageResponse.json();
            setImages(metadata.images.map(img => img.url));
          }
        } else {
          throw new Error('Invalid listing response format');
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        toast({
          title: 'Error loading listing',
          description: error instanceof Error ? error.message : 'Failed to load listing',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [client, contractAddress, id, toast, walletAddress]);

  const handlePurchase = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      console.log('Attempting purchase with price:', listing.price, 'uatom');
      const funds = [{ amount: listing.price.toString(), denom: 'uatom' }];
      await client.execute(
        walletAddress,
        contractAddress,
        { purchase: { listing_id: listing.listing_id } },
        {
          amount: [{ amount: "37500", denom: "uatom" }],
          gas: "500000"
        },
        "",
        funds
      );
      toast({ title: 'Purchase successful', status: 'success' });
      // Refresh listing data
      navigate(0);
    } catch (error) {
      console.error('Purchase error:', error);
      toast({ 
        title: 'Purchase failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleMarkShipped = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { sign_shipped: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      toast({ title: 'Marked as shipped', status: 'success' });
      navigate(0);
    } catch (error) {
      toast({ title: 'Failed to mark as shipped', status: 'error' });
    }
  };

  const handleMarkReceived = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { sign_received: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );

      // After marking as received, unpin the IPFS files
      if (listing.external_id) {
        try {
          const ipfsUrl = new URL(listing.external_id);
          const cid = ipfsUrl.pathname.split('/').pop();
          if (cid) {
            await unpinFile(cid);
          }
        } catch (error) {
          console.error('Error unpinning file:', error);
          // Don't throw here as the main operation succeeded
        }
      }

      toast({ title: 'Marked as received', status: 'success' });
      navigate(0);
    } catch (error) {
      toast({ title: 'Failed to mark as received', status: 'error' });
    }
  };

  const handleRequestArbitration = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { request_arbitration: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      toast({ title: 'Arbitration requested', status: 'success' });
      navigate(0);
    } catch (error) {
      toast({ title: 'Failed to request arbitration', status: 'error' });
    }
  };

  const handleCancelSale = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { seller_cancel_sale: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      toast({ title: 'Sale cancelled successfully', status: 'success' });
      navigate(0);
    } catch (error) {
      toast({ title: 'Failed to cancel sale', status: 'error' });
    }
  };

  const handleCancelPurchase = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      await client.execute(
        walletAddress,
        contractAddress,
        { cancel_purchase: { listing_id: listing.listing_id } },
        {
          amount: [],
          gas: "500000",
        }
      );
      toast({ title: 'Purchase cancelled successfully', status: 'success' });
      navigate(0);
    } catch (error) {
      toast({ title: 'Failed to cancel purchase', status: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!client || !walletAddress || !listing) return;
    try {
      await deleteListing(listing.listing_id, walletAddress);
      toast({ title: 'Listing deleted successfully', status: 'success' });
      navigate('/');
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast({ 
        title: 'Failed to delete listing', 
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error' 
      });
    }
    setIsDeleteDialogOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box display="flex" justifyContent="center" alignItems="center" minH="60vh">
          <Spinner size="xl" />
        </Box>
      </Container>
    );
  }

  if (!listing) {
    return (
      <Container maxW="container.xl" py={8}>
        <Button leftIcon={<ArrowBackIcon />} onClick={() => navigate('/')} mb={8}>
          Back to Listings
        </Button>
        <Text>Listing not found</Text>
      </Container>
    );
  }

  // Add debug log when rendering
  console.log('Rendering with:', {
    listing,
    walletAddress,
    isSeller: listing?.seller === walletAddress,
    isBought: listing?.bought,
    isShipped: listing?.shipped,
    isReceived: listing?.received,
    hasArbitration: listing?.arbitration_requested
  });

  return (
    <Container maxW="container.xl" py={8}>
      <Button leftIcon={<ArrowBackIcon />} onClick={() => navigate('/')} mb={8}>
        Back to Listings
      </Button>

      <Box display={{ md: 'flex' }} gap={8}>
        {/* Image Gallery */}
        <Box flex="1">
          <Box position="relative">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[currentImageIndex]}
                  alt={`${listing.listing_title} - Image ${currentImageIndex + 1}`}
                  borderRadius="lg"
                  w="full"
                  maxH="600px"
                  objectFit="cover"
                />
                {images.length > 1 && (
                  <HStack 
                    position="absolute" 
                    bottom="4" 
                    left="50%" 
                    transform="translateX(-50%)"
                    spacing={4}
                  >
                    <IconButton
                      aria-label="Previous image"
                      icon={<ChevronLeftIcon />}
                      onClick={previousImage}
                      isRound
                      bg="whiteAlpha.800"
                    />
                    <Text bg="blackAlpha.700" color="white" px={3} py={1} borderRadius="md">
                      {currentImageIndex + 1} / {images.length}
                    </Text>
                    <IconButton
                      aria-label="Next image"
                      icon={<ChevronRightIcon />}
                      onClick={nextImage}
                      isRound
                      bg="whiteAlpha.800"
                    />
                  </HStack>
                )}
              </>
            ) : (
              <Box
                borderRadius="lg"
                bg={bgColor}
                borderWidth={1}
                borderColor={borderColor}
                h="400px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="gray.500">No images available</Text>
              </Box>
            )}
          </Box>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <HStack mt={4} spacing={2} overflowX="auto" py={2}>
              {images.map((url, index) => (
                <Image
                  key={index}
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  boxSize="60px"
                  objectFit="cover"
                  cursor="pointer"
                  borderRadius="md"
                  opacity={currentImageIndex === index ? 1 : 0.6}
                  onClick={() => setCurrentImageIndex(index)}
                  _hover={{ opacity: 1 }}
                />
              ))}
            </HStack>
          )}
        </Box>

        {/* Listing Details */}
        <Box 
          flex="1" 
          bg={bgColor} 
          p={6} 
          borderRadius="lg"
          borderWidth={1}
          borderColor={borderColor}
        >
          <VStack align="stretch" spacing={4}>
            <Heading as="h1" size="xl">{listing.listing_title}</Heading>
            
            <HStack>
              <Badge colorScheme="blue">Price: {listing.price / 1_000_000} ATOM</Badge>
              {listing.bought && <Badge colorScheme="green">Sold</Badge>}
              {listing.shipped && <Badge colorScheme="orange">Shipped</Badge>}
              {listing.received && <Badge colorScheme="green">Received</Badge>}
              {listing.arbitration_requested && <Badge colorScheme="red">Arbitration Requested</Badge>}
            </HStack>

            <Text fontSize="lg">{listing.text}</Text>
            
            <Box>
              <Text fontWeight="bold">Seller:</Text>
              <Text>{listing.seller}</Text>
            </Box>

            {listing.buyer && (
              <Box>
                <Text fontWeight="bold">Buyer:</Text>
                <Text>{listing.buyer}</Text>
              </Box>
            )}

            <Box>
              <Text fontWeight="bold">Contact:</Text>
              <Text>{listing.contact}</Text>
            </Box>

            <Box>
              <Text fontWeight="bold">Tags:</Text>
              <HStack mt={2} wrap="wrap">
                {(listing.tags || []).map((tag, index) => (
                  <Badge key={index} colorScheme="purple">{tag}</Badge>
                ))}
              </HStack>
            </Box>

            {/* Action Buttons */}
            <Box mt={6}>
              {!listing.bought && walletAddress !== listing.seller && (
                <Button 
                  colorScheme="blue" 
                  size="lg" 
                  w="full" 
                  onClick={handlePurchase}
                  mb={4}
                >
                  Purchase for {listing.price / 1_000_000} ATOM
                </Button>
              )}
              
              {listing.bought && listing.seller === walletAddress && !listing.received && (
                <>
                  {!listing.shipped && (
                    <Button 
                      colorScheme="green" 
                      size="lg" 
                      w="full" 
                      onClick={handleMarkShipped}
                      mb={4}
                    >
                      Mark as Shipped
                    </Button>
                  )}
                  <Button 
                    colorScheme="red" 
                    size="lg" 
                    w="full" 
                    onClick={handleCancelSale}
                    mb={4}
                  >
                    Cancel Sale
                  </Button>
                </>
              )}
              
              {listing.bought && listing.buyer === walletAddress && !listing.shipped && (
                <Button 
                  colorScheme="red" 
                  size="lg" 
                  w="full" 
                  onClick={handleCancelPurchase}
                  mb={4}
                >
                  Cancel Purchase
                </Button>
              )}
              
              {listing.bought && listing.shipped && listing.buyer === walletAddress && !listing.received && (
                <Button 
                  colorScheme="green" 
                  size="lg" 
                  w="full" 
                  onClick={handleMarkReceived}
                  mb={4}
                >
                  Mark as Received
                </Button>
              )}
              
              {listing.bought && listing.shipped && !listing.arbitration_requested &&
               (listing.buyer === walletAddress || listing.seller === walletAddress) && (
                <Button 
                  colorScheme="red" 
                  size="lg" 
                  w="full" 
                  onClick={handleRequestArbitration}
                  mb={4}
                >
                  Request Arbitration
                </Button>
              )}

              {/* Delete button for sellers */}
              {!listing.bought && listing.seller === walletAddress && (
                <Button 
                  colorScheme="red" 
                  size="lg" 
                  w="full" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  mt={4}
                >
                  Delete Listing
                </Button>
              )}
            </Box>
          </VStack>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Listing
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
} 