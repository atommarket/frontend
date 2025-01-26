use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
pub struct Config {
    pub admin: Addr,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
pub struct Profile {
    pub profile_name: String,
    //how many transactions has this profile enagaged in
    pub transaction_count: u64,
    //how many ratings have they received
    pub ratings: u64,
    //total count of all ratings
    pub rating_count: u64,
    //rating_count divided by ratings
    pub average_rating: u64,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
pub struct Listing {
    //tracks specific listings through unique identifier
    pub listing_id: u64,
    //title for FE searches
    pub listing_title: String,
    //ipfs link (for photograph)
    pub external_id: String,
    //price of item
    pub price: u64,
    //store summary of listing / edits
    pub text: String,
    pub tags: Vec<String>,
    pub seller: String,
    //Signal or Session contact
    pub contact: String,
    //If true, item is unbuyable
    pub bought: bool,
    //stores buyer address to ensure signer is legit buyer
    pub buyer: Option<String>,
    //seller marks shipped which is one key to releasing funds
    pub shipped: bool,
    //buyer marks received which is one key to releasing funds
    pub received: bool,
    //arbitration request
    pub arbitration_requested: bool,
    pub creation_date: String,
    pub last_edit_date: Option<String>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
pub struct Relationship {
    pub seller: String,
    pub buyer: String,
    pub sell_date: String,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const PROFILES: Map<Addr, Profile> = Map::new("profiles");
pub const PROFILE_NAME: Map<Addr, String> = Map::new("profile_name");
pub const LISTING: Map<u64, Listing> = Map::new("listing");
pub const LAST_LISTING_ID: Item<u64> = Item::new("last_listing_id");
pub const LISTING_COUNT: Item<u64> = Item::new("number_of_listings");
pub const LISTING_TITLES: Map<String, u64> = Map::new("listing_titles");
pub const RELATIONSHIPS: Map<String, Relationship> = Map::new("relationship");
