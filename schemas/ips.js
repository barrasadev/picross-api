module.exports = {
  ip: { type: String, required: true },
  country: { type: String },
  countryFlag: { type: String },
  region: { type: String },
  city: { type: String },
  postal: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  timezone: { type: String },
  isp: { type: String },
  organization: { type: String },
  asn: { type: String }
}