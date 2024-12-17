use crate::models::{
  carrier,
  customer::{self, Customer, CustomerId},
  shipment, shipment_id,
};
use std::{
  cell::RefCell,
  collections::HashMap,
  ops::{Deref, DerefMut},
};

type CustomersStore = HashMap<customer::CustomerId, customer::Customer>;
type ShipmentsStore = HashMap<shipment_id::ShipmentIdInner, shipment::Shipment>;
type CarriersStore = HashMap<carrier::CarrierId, carrier::Carrier>;

#[derive(Default)]
pub struct Customers(CustomersStore);

#[derive(Default)]
pub struct Shipments(ShipmentsStore);

#[derive(Default)]
pub struct Carriers(CarriersStore);

impl Deref for Shipments {
  type Target = ShipmentsStore;

  fn deref(&self) -> &Self::Target {
      &self.0
  }
}

impl DerefMut for Shipments {
  fn deref_mut(&mut self) -> &mut Self::Target {
      &mut self.0
  }
}

impl Deref for Customers {
  type Target = CustomersStore;

  fn deref(&self) -> &Self::Target {
      &self.0
  }
}

impl DerefMut for Customers {
  fn deref_mut(&mut self) -> &mut Self::Target {
      &mut self.0
  }
}

impl Deref for Carriers {
  type Target = CarriersStore;

  fn deref(&self) -> &Self::Target {
      &self.0
  }
}

impl DerefMut for Carriers {
  fn deref_mut(&mut self) -> &mut Self::Target {
      &mut self.0
  }
}

impl Shipments {
  pub fn get_all_pending(&self) -> Vec<shipment::Shipment> {
      self.values()
          .filter(|shipment| *shipment.status() == shipment::ShipmentStatus::Pending)
          .cloned()
          .collect()
  }

  pub fn get_all_for_customer(&self, customer_id: &CustomerId) -> Vec<shipment::Shipment> {
      self.values()
          .filter(|shipment| shipment.customer_id() == *customer_id)
          .cloned()
          .collect()
  }

  pub fn get_all_for_shipper(&self, carrier_id: &carrier::CarrierId) -> Vec<shipment::Shipment> {
      self.values()
          .filter(|shipment| shipment.carrier_id() == Some(*carrier_id))
          .cloned()
          .collect()
  }
}

impl Customers {
  pub fn get_or_create(
      &mut self,
      customer_name: String,
      customer_id: CustomerId,
  ) -> &mut Customer {
      let customer_exists = self.get_mut(&customer_id).is_some();

      if !customer_exists {
          let customer = Customer::new(customer_id, customer_name);
          self.insert(customer_id, customer);
      }

      self.get_mut(&customer_id).expect("")
  }
}

impl Carriers {
  pub fn get_or_create(
      &mut self,
      carrier_id: carrier::CarrierId,
      carrier_name: String,
  ) -> &mut carrier::Carrier {
      let carrier_exists = self.get_mut(&carrier_id).is_some();

      if !carrier_exists {
          let carrier = carrier::Carrier::new(carrier_id, carrier_name);
          self.insert(carrier_id, carrier);
      }

      self.get_mut(&carrier_id).expect("")
  }
}

thread_local! {
  pub static CUSTOMERS: RefCell<Customers> = Default::default();
  pub static SHIPMENT_COUNTER: RefCell<u64> = Default::default();
  pub static SHIPMENTS: RefCell<Shipments> = Default::default();
  pub static CARRIERS: RefCell<Carriers> = Default::default();
}