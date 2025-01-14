mod models;
mod state;

use anyhow::anyhow;
use candid::Principal;
use candid::{CandidType, Deserialize};
use ic_cdk::{init, query, update};
use models::{
    customer::Customer,
    shipment::{Shipment, ShipmentInfo, ShipmentLocation, ShipmentStatus, SizeCategory},
    shipment_id::{ShipmentId, ShipmentIdInner},
};
use state::{CARRIERS, CUSTOMERS, SHIPMENTS};
use std::collections::HashSet;
use std::{cell::RefCell, collections::VecDeque};

#[derive(CandidType, Deserialize, Clone)]
pub enum ShipmentEvent {
    Created {
        shipment_id: ShipmentIdInner,
    },
    StatusUpdated {
        shipment_id: ShipmentIdInner,
        status: ShipmentStatus,
    },
    CarrierAssigned {
        shipment_id: ShipmentIdInner,
        carrier: Principal,
    },
    Finalized {
        party: Principal,
        shipment_id: ShipmentIdInner,
    },
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TimestampedEvent {
    pub event: ShipmentEvent,
    pub timestamp: u64,
    pub sequence: u64,
}

thread_local! {
    static EVENTS: RefCell<VecDeque<TimestampedEvent>> = RefCell::new(VecDeque::new());
    static LAST_SEQUENCE: RefCell<u64> = RefCell::new(0);
    static ADMINS: RefCell<HashSet<Principal>> = RefCell::new(HashSet::new());
}

const MAX_EVENTS_AGE: u64 = 24 * 60 * 60; // 24 hours in seconds
const MAX_EVENTS_SIZE: usize = 1000;

fn check_anonymous(caller: Principal) -> Result<(), String> {
    if caller == Principal::anonymous() {
        return Err("Cannot be called anonymously".to_string());
    }

    Ok(())
}

fn check_admin(caller: Principal) -> Result<(), String> {
    if !ADMINS.with_borrow(|admins| admins.contains(&caller)) {
        return Err("Cannot be called by non-admins".to_string());
    }

    Ok(())
}

#[init]
fn init() {
    ic_cdk::print("Initializing the shipment service");

    // Create a default customer
    let mut default_customer = Customer::new(
        Principal::from_text("ryssj-xcbz7-gbw4s-p7fio-lolnx-5nr7a-yxufe-cvpfg-6iujw-2ypsz-rqe")
            .unwrap(),
        "Test".to_string(),
    );

    // Define a set of realistic coordinates for shipment locations
    let locations = vec![
        ("A", 40.7128, -74.0060),  // New York, USA
        ("B", 34.0522, -118.2437), // Los Angeles, USA
        ("C", 51.5074, -0.1278),   // London, UK
        ("D", 48.8566, 2.3522),    // Paris, France
        ("E", 35.6895, 139.6917),  // Tokyo, Japan
        ("F", -33.8688, 151.2093), // Sydney, Australia
    ];

    let names = vec![
        "John Doe",
        "Jane Doe",
        "Alice Smith",
        "Bob Smith",
        "Charlie Brown",
        "Daisy Brown",
        "Eve Green",
        "Frank Green",
        "Grace Black",
        "Harry Black",
    ];

    for i in 0..10 {
        let shipment_id = ShipmentId::new();
        let inner_shipment_id = shipment_id.into_inner();

        let (origin_label, origin_lat, origin_lng) = &locations[i % locations.len()];
        let (dest_label, dest_lat, dest_lng) = &locations[(i + 1) % locations.len()];

        let shipment = Shipment::create(
            &mut default_customer,
            inner_shipment_id,
            "hashed_secret".to_string(),
            names[i].to_string(),
            ShipmentInfo::new(
                100u64 + i as u64,
                10u64 + i as u64,
                ShipmentLocation::new(origin_label.to_string(), *origin_lat, *origin_lng),
                ShipmentLocation::new(dest_label.to_string(), *dest_lat, *dest_lng),
                SizeCategory::Envelope,
            ),
        );

        // Insert the shipment into the SHIPMENTS collection
        SHIPMENTS.with_borrow_mut(|shipments| shipments.insert(inner_shipment_id, shipment));
    }
}

#[update(name = "finalizeShipment")]
async fn finalize_shipment(
    shipment_id: ShipmentIdInner,
    secret_key: Option<String>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let (finalize_result, _carrier, _value, _price) = SHIPMENTS
        .with_borrow_mut(|shipments| {
            let shipment = shipments
                .get_mut(&shipment_id)
                .ok_or(anyhow!("Shipment not found"))?;

            CUSTOMERS.with_borrow_mut(|customers| {
                let customer = customers
                    .get_mut(&shipment.customer_id())
                    .ok_or(anyhow!("Customer not found"))?;

                CARRIERS.with_borrow_mut(|carriers| {
                    let carrier = carriers
                        .get_mut(&shipment.carrier_id().ok_or(anyhow!("Carrier not set"))?)
                        .ok_or(anyhow!("Carrier not found"))?;

                    Ok((
                        shipment.finalize(carrier, customer, secret_key, caller),
                        carrier.id(),
                        shipment.info().value(),
                        shipment.info().price(),
                    ))
                })
            })
        })
        .map_err(|e: anyhow::Error| e.to_string())?;

    if finalize_result.is_ok() {
        add_event(ShipmentEvent::Finalized {
            shipment_id,
            party: caller,
        });
    }

    finalize_result.map_err(|e| e.to_string())
}

#[update(name = "buyShipment")]
async fn buy_shipment(carrier_name: String, shipment_id: ShipmentIdInner) -> Result<(), String> {
    let carrier_id = ic_cdk::caller();
    check_anonymous(carrier_id)?;

    let (buy_result, _amount) = CARRIERS
        .with_borrow_mut(|carriers| {
            let carrier = carriers.get_or_create(carrier_id, carrier_name);

            SHIPMENTS.with_borrow_mut(|shipments| {
                let shipment = shipments
                    .get_mut(&shipment_id)
                    .ok_or(anyhow!("Shipment not found"))?;

                Ok((shipment.buy(carrier), shipment.info().value()))
            })
        })
        .map_err(|e: anyhow::Error| e.to_string())?;

    if buy_result.is_ok() {
        add_event(ShipmentEvent::CarrierAssigned {
            shipment_id,
            carrier: carrier_id,
        });
    }

    buy_result.map_err(|e| e.to_string())
}

#[update(name = "createShipment")]
async fn create_shipment(
    customer_name: String,
    shipment_name: String,
    hashed_secret: String,
    shipment_info: ShipmentInfo,
) -> Result<ShipmentIdInner, String> {
    let customer_id = ic_cdk::caller();
    check_anonymous(customer_id)?;

    let shipment_id = CUSTOMERS.with_borrow_mut(|customers| {
        let customer = customers.get_or_create(customer_name, customer_id);
        let shipment_id = ShipmentId::new();
        let inner_shipment_id = shipment_id.into_inner();
        let shipment = Shipment::create(
            customer,
            inner_shipment_id,
            hashed_secret,
            shipment_name,
            shipment_info,
        );
        SHIPMENTS.with_borrow_mut(|shipments| shipments.insert(inner_shipment_id, shipment));

        add_event(ShipmentEvent::Created {
            shipment_id: inner_shipment_id,
        });

        inner_shipment_id
    });

    Ok(shipment_id)
}

#[query(name = "listPendingShipments")]
fn get_pending_shipments() -> Vec<Shipment> {
    SHIPMENTS.with_borrow(|shipments| shipments.get_all_pending())
}

#[query(name = "listUserShipments")]
fn get_user_shipments() -> (Vec<Shipment>, Vec<Shipment>) {
    let customer_id = ic_cdk::caller();

    let shippers = SHIPMENTS.with_borrow(|shipments| shipments.get_all_for_shipper(&customer_id));
    let customers = SHIPMENTS.with_borrow(|shipments| shipments.get_all_for_customer(&customer_id));
    (shippers, customers)
}

#[query]
fn roles() -> (bool, bool) {
    let carrier = CARRIERS.with_borrow(|carriers| carriers.contains_key(&ic_cdk::caller()));
    let customer = CUSTOMERS.with_borrow(|customers| customers.contains_key(&ic_cdk::caller()));

    (carrier, customer)
}

#[query]
fn shipments() -> Vec<Shipment> {
    SHIPMENTS.with_borrow(|shipments| shipments.values().cloned().collect())
}

#[query(name = "getShipment")]
fn get_shipment(shipment_id: ShipmentIdInner) -> Option<Shipment> {
    SHIPMENTS.with_borrow(|shipments| shipments.get(&shipment_id).cloned())
}

fn add_event(event: ShipmentEvent) {
    LAST_SEQUENCE.with(|seq| {
        let next_seq = *seq.borrow() + 1;
        *seq.borrow_mut() = next_seq;

        let time_nanos = ic_cdk::api::time();
        let timestamp = time_nanos / 1_000_000_000;
        let timestamped = TimestampedEvent {
            event,
            timestamp,
            sequence: next_seq,
        };

        EVENTS.with(|events| {
            let mut events = events.borrow_mut();
            events.push_back(timestamped);

            // Maintain max size
            while events.len() > MAX_EVENTS_SIZE {
                events.pop_front();
            }
        });
    });
}

#[query(name = "getEvents")]
fn get_events(since_sequence: Option<u64>) -> Vec<TimestampedEvent> {
    EVENTS.with(|events| {
        events
            .borrow()
            .iter()
            .filter(|e| match since_sequence {
                Some(seq) => e.sequence > seq,
                None => true,
            })
            .cloned()
            .collect()
    })
}

#[update(name = "purgeOldEvents")]
fn purge_old_events() -> Result<(), String> {
    check_admin(ic_cdk::caller())?;

    let current_time = ic_cdk::api::time();
    let current_time_secs = current_time / 1_000_000_000;

    EVENTS.with(|events| {
        events.borrow_mut().retain(|e| {
            current_time_secs - e.timestamp < MAX_EVENTS_AGE
        });
    });

    Ok(())
}

ic_cdk::export_candid!();
