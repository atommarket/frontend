export const IDL = {
  "address": "ELhZ8euFpQ1pzQUiUofcVjLh2MFKRDHtcMeZDaRLFTLy",
  "metadata": {
    "name": "solana_marketplace",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "version": "0.1.0",
  "name": "solana_marketplace",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createProfile",
      "accounts": [
        {
          "name": "profile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "profileName",
          "type": "string"
        }
      ]
    },
    {
      "name": "createListing",
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "listing",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "listingTitle",
          "type": "string"
        },
        {
          "name": "externalId",
          "type": "string"
        },
        {
          "name": "text",
          "type": "string"
        },
        {
          "name": "tags",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "contact",
          "type": "string"
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "purchase",
      "accounts": [
        {
          "name": "listing",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "signShipped",
      "accounts": [
        {
          "name": "listing",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "relationship",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "signReceived",
      "accounts": [
        {
          "name": "listing",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buyer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "seller",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "listingCount",
            "type": "u64"
          },
          {
            "name": "lastListingId",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Profile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "transactionCount",
            "type": "u64"
          },
          {
            "name": "ratings",
            "type": "u64"
          },
          {
            "name": "ratingCount",
            "type": "u64"
          },
          {
            "name": "averageRating",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listingId",
            "type": "u64"
          },
          {
            "name": "listingTitle",
            "type": "string"
          },
          {
            "name": "externalId",
            "type": "string"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "text",
            "type": "string"
          },
          {
            "name": "tags",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "seller",
            "type": "publicKey"
          },
          {
            "name": "contact",
            "type": "string"
          },
          {
            "name": "bought",
            "type": "bool"
          },
          {
            "name": "buyer",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "shipped",
            "type": "bool"
          },
          {
            "name": "received",
            "type": "bool"
          },
          {
            "name": "arbitrationRequested",
            "type": "bool"
          },
          {
            "name": "creationDate",
            "type": "i64"
          },
          {
            "name": "lastEditDate",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listingId",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Relationship",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "type": "publicKey"
          },
          {
            "name": "buyer",
            "type": "publicKey"
          },
          {
            "name": "sellDate",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6001,
      "name": "TooMuchText",
      "msg": "Text exceeds maximum length"
    },
    {
      "code": 6002,
      "name": "OnlyOneLink",
      "msg": "Only one IPFS link allowed"
    },
    {
      "code": 6003,
      "name": "NotShipped",
      "msg": "Item must be marked as shipped before receiving"
    },
    {
      "code": 6004,
      "name": "AlreadyPurchased",
      "msg": "This listing is already purchased"
    },
    {
      "code": 6005,
      "name": "MustUseJulianGateway",
      "msg": "Must use Julian's IPFS gateway"
    },
    {
      "code": 6006,
      "name": "TitleTooLong",
      "msg": "Title exceeds maximum length"
    },
    {
      "code": 6007,
      "name": "TooManyTags",
      "msg": "Too many tags"
    },
    {
      "code": 6008,
      "name": "TagTooLong",
      "msg": "Tag exceeds maximum length"
    },
    {
      "code": 6009,
      "name": "ContactTooLong",
      "msg": "Contact info exceeds maximum length"
    },
    {
      "code": 6010,
      "name": "ProfileNameTooLong",
      "msg": "Profile name exceeds maximum length"
    }
  ]
} as const;

export type SolanaMarketplace = typeof IDL;

