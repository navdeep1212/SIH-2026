/**
 * Shared canonical vocabulary for vehicle types and colors.
 * Matches ml-service/vehicle_constants.py and frontend mappings.
 */

const ALLOWED_VEHICLE_TYPES = [
  'sedan',
  'suv',
  'bus',
  'truck',
  'motorcycle',
  'unknown'
];

const ALLOWED_VEHICLE_COLORS = [
  'white',
  'black',
  'silver',
  'gray',
  'red',
  'blue',
  'yellow',
  'green',
  'orange',
  'brown',
  'unknown'
];

module.exports = {
  ALLOWED_VEHICLE_TYPES,
  ALLOWED_VEHICLE_COLORS,
};

