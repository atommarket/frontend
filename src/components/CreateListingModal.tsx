import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { AddIcon } from '@chakra-ui/icons';
import { PinataSDK } from 'pinata-web3';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: SigningCosmWasmClient | null;
  contractAddress: string;
  walletAddress: string;
  onSuccess: () => void;
}

interface FormData {
  title: string;
  text: string;
  tags: string;
  contact: string;
  price: string;
  images: File[];
}

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const pinata = new PinataSDK({ pinataJwt: PINATA_JWT });

export default function CreateListingModal({
  isOpen,
  onClose,
  client,
  contractAddress,
  walletAddress,
  onSuccess,
}: CreateListingModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    text: '',
    tags: '',
    contact: '',
    price: '',
    images: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      const totalImages = formData.images.length + newImages.length;
      
      if (totalImages > 5) {
        toast({
          title: 'Too many images',
          description: 'Maximum 5 images allowed',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const uploadToIPFS = async (files: File[]): Promise<string> => {
    try {
      if (files.length === 0) {
        throw new Error('No files to upload');
      }

      // Upload all images first
      const imageUploads = await Promise.all(
        files.map(async (file) => {
          console.log('Uploading file:', file.name);
          const upload = await pinata.upload.file(file);
          console.log('Upload response:', upload);
          return upload.IpfsHash;
        })
      );

      // Create a metadata JSON containing all image CIDs
      const metadata = {
        images: imageUploads.map(hash => ({
          cid: hash,
          url: `https://gateway.pinata.cloud/ipfs/${hash}`
        }))
      };

      // Upload the metadata JSON
      console.log('Uploading metadata:', metadata);
      const metadataUpload = await pinata.upload.json(metadata);
      console.log('Metadata upload response:', metadataUpload);

      if (!metadataUpload.IpfsHash) {
        throw new Error('No IPFS hash received from Pinata for metadata');
      }

      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataUpload.IpfsHash}`;
      console.log('Final metadata URL:', metadataUrl);
      return metadataUrl;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!client || !walletAddress) {
      toast({ 
        title: 'Error',
        description: 'Wallet not connected',
        status: 'error' 
      });
      return;
    }

    setIsUploading(true);
    try {
      console.log('Starting listing creation...');
      
      // Upload images if any
      let ipfsUrl = '';
      if (formData.images.length > 0) {
        console.log('Uploading images...');
        try {
          ipfsUrl = await uploadToIPFS(formData.images);
          console.log('Images uploaded successfully:', ipfsUrl);
        } catch (error: any) {
          console.error('Image upload error:', error);
          throw new Error(`Failed to upload images: ${error.message || 'Unknown error'}`);
        }
      }

      // Prepare the message
      const price = parseFloat(formData.price);
      if (isNaN(price)) {
        throw new Error('Invalid price value');
      }

      const msg = {
        create_listing: {
          listing_title: formData.title,
          external_id: ipfsUrl,
          text: formData.text,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          contact: formData.contact,
          price: Math.floor(price * 1_000_000), // Convert to ujuno
        }
      };

      console.log('Executing contract with message:', JSON.stringify(msg, null, 2));

      const result = await client.execute(
        walletAddress,
        contractAddress,
        msg,
        {
          amount: [],
          gas: "500000",
        }
      );

      console.log('Contract execution result:', result);
      
      onSuccess();
      onClose();
      toast({ 
        title: 'Listing created successfully',
        description: 'Your listing has been created and will appear shortly',
        status: 'success' 
      });
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast({ 
        title: 'Failed to create listing',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Listing</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Title</FormLabel>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Tags (comma-separated)</FormLabel>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Contact Info</FormLabel>
              <Input
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Price (JUNO)</FormLabel>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Images</FormLabel>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                display="none"
                id="image-upload-input"
              />
              <Button
                as="label"
                htmlFor="image-upload-input"
                leftIcon={<AddIcon />}
                w="full"
                cursor="pointer"
              >
                Add Images
              </Button>
              {formData.images.length > 0 && (
                <Text mt={2}>
                  {formData.images.length} image(s) selected
                </Text>
              )}
            </FormControl>
            
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              w="full"
              isLoading={isUploading}
            >
              Create Listing
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
} 