const superClass = require('./superClass')
const ipSchema = require('../schemas/ips')
const mongoose = require('mongoose')
const axios = require('axios')

class ip extends superClass {
  constructor() {
    super()
    this.schema = ipSchema
    this.model = mongoose.models.IP || mongoose.model('IP', new mongoose.Schema({}, { strict: false }))
  }

  async findByIP(ip) {
    const result = await this.model.findOne({ ip })
    if (!result) return this.set(null)
    this.set(result.toObject())
    return this.get()
  }

  async createFromAPI(ipAddress) {
    try {
      const { data } = await axios.get(`https://ipapi.co/${ipAddress}/json/`)

      const ipInfo = {
        ip: data.ip,
        country: data.country_name,
        countryFlag: `https://flagcdn.com/${data.country_code?.toLowerCase()}.svg`,
        region: data.region,
        city: data.city,
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        organization: data.org,
        asn: data.asn
      }

      const result = await this.model.create(ipInfo)
      this.set(result.toObject())
      return this.get()
    } catch (err) {
      console.error('❌ Error al obtener datos de IP externa:', err.message)
      return null
    }
  }
}

module.exports = ip
