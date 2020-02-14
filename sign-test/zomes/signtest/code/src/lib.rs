#![feature(vec_remove_item)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![feature(proc_macro_hygiene)]

#[macro_use]
extern crate hdk;
#[macro_use]
extern crate serde;
#[macro_use]
extern crate serde_derive;
#[macro_use]
extern crate serde_json;
#[macro_use]
extern crate holochain_json_derive;
#[macro_use]
extern crate hdk_proc_macros;

use hdk::prelude::*;

use hdk::prelude::*;
use holochain_wasm_utils::api_serialization::query::QueryArgsNames;

use hdk::holochain_core_types::dna::entry_types::Sharing;
use hdk::holochain_json_api::{error::JsonError, json::JsonString};
use hdk::{entry_definition::ValidatingEntryType, AGENT_ADDRESS};
use hdk::{
    error::{ZomeApiError, ZomeApiResult},
    holochain_core_types::entry::Entry,
    holochain_core_types::{
        signature::{Provenance, Signature},
        time::Timeout,
    },
    holochain_persistence_api::cas::content::Address,
};
use hdk_proc_macros::zome;
use std::convert::TryFrom;

#[derive(Serialize, Deserialize, Debug, self::DefaultJson, Clone)]
pub struct MyEntry {
    content: String,
}

#[zome]
mod sign_zome {

    #[init]
    fn init() {
        Ok(())
    }

    #[validate_agent]
    pub fn validate_agent(validate_data: EntryValidationData<AgentId>) {
        Ok(())
    }
    #[entry_def]
    fn entry_definition() -> ValidatingEntryType {
        entry!(
            name:"myentry",
            description:"This is the example entry",
            sharing:Sharing::Public,
            validation_package:||{
                hdk::ValidationPackageDefinition::Entry
            },
            validation:|_validation_data: hdk::EntryValidationData<MyEntry>|{
                Ok(())
            }
        )
    }

    #[zome_fn("hc_public")]
    fn create(title: String) -> ZomeApiResult<Address> {
        let new_entry = MyEntry { content: title };
        let entry = Entry::App("myentry".into(), new_entry.into());
        let address = hdk::commit_entry(&entry)?;
        Ok(address)
    }

    // #[zome_fn("hc_public")]
    // fn get_entry(address: Address) -> ZomeApiResult<Option<Entry>> {
    //     hdk::get_entry(&address)
    // }

    #[zome_fn("hc_public")]
    pub fn get_agent_address() -> ZomeApiResult<Address> {
        Ok(AGENT_ADDRESS.to_string().into())
    }

    #[zome_fn("hc_public")]
    pub fn sign_entry(entry_address: Address) -> ZomeApiResult<Address> {
        let entry = hdk::get_entry(&entry_address).unwrap().unwrap();
        let signature = hdk::sign(entry_address.clone())?;
        let my_provenance = Provenance::new(AGENT_ADDRESS.clone(), Signature::from(signature));
        let options = CommitEntryOptions::new(vec![my_provenance]);
        let address = hdk::commit_entry_result(&entry, options)?;
        Ok(address.address())
    }

    #[zome_fn("hc_public")]
    pub fn get_entry(entry_address: Address) -> ZomeApiResult<String> {
        let option =
            GetEntryOptions::new(StatusRequestKind::Latest, true, true, Timeout::default());

        let entry_result = hdk::get_entry_result(&entry_address, option)?;
        Ok(JsonString::from(entry_result).to_string())
    }

    #[zome_fn("hc_public")]
    pub fn get_provinence(entry_address: Address) -> ZomeApiResult<String> {
        let signature = hdk::sign(entry_address.clone())?;
        let provenance = Provenance::new(AGENT_ADDRESS.clone(), Signature::from(signature));
        return Ok(JsonString::from(provenance).to_string());
    }
    #[zome_fn("hc_public")]
    pub fn is_signed_by_me(entry_address: Address) -> ZomeApiResult<bool> {
        let option =
            GetEntryOptions::new(StatusRequestKind::Latest, true, true, Timeout::default());

        let entry_result = hdk::get_entry_result(&entry_address, option)?;
        let signature = hdk::sign(entry_address.clone())?;
        let my_provenance = Provenance::new(AGENT_ADDRESS.clone(), Signature::from(signature));

        if let GetEntryResultType::Single(item) = entry_result.result {
            for header in item.headers {
                for i in header.provenances().iter() {
                    if JsonString::from(i).to_string()
                        == JsonString::from(&my_provenance).to_string()
                    {
                        return Ok(true);
                    }
                }
            }
            return Ok(false);
        }

        return Ok(false);
    }

    // TODO:: GET MY Signature
}
