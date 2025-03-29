const superClass = require('./superClass')
const IP = require('./ip')

const userSchema = require('../schemas/user')
const mongoose = require('mongoose')
require('dotenv').config();
const jwt = require('jsonwebtoken')

class user extends superClass {
  constructor() {
    super()
    this.schema = userSchema
    this.model = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))
  }

  async findById(id) {
    const result = await this.model.findOne({ _id: id })
    if (!result) return this.set(null)
    this.set(result.toObject())
    return this.get()
  }

  async create({ username, email, password } = {}) {
    if (!username) {
      const random = Math.floor(1000 + Math.random() * 9000)
      username = `PicrossUser${random}`
    }

    const userData = { username }
    if (email) userData.email = email
    if (password) userData.password = password

    for (const key in this.schema) {
      const def = this.schema[key].default
      if (def && userData[key] === undefined) {
        userData[key] = typeof def === 'function' ? def() : def
      }
    }

    const result = await this.model.create(userData)
    this.set(result.toObject())
    return this.get()
  }

  getToken() {
    const data = this.get()
    const id = data?._id?.toString()

    if (!id) return null

    const token = jwt.sign({ id }, process.env.JWT_SECRET)

    return token
  }

  static getIdByToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      return decoded.id
    } catch (err) {
      return null
    }
  }

  async registerActivity(ip) {
    if (!ip || ip === '0.0.0.0') return false

    const now = new Date()
    const access = this.get('access') || []

    const lastAccess = access[access.length - 1]
    const isSameIP = lastAccess?.ip === ip
    const isStillActive = lastAccess?.end && new Date(lastAccess.end) > now

    if (isSameIP && isStillActive) {
      // Renovar
      lastAccess.end = new Date(now.getTime() + 30 * 1000)
    } else {
      // Nueva actividad
      access.push({
        ip,
        start: now,
        end: new Date(now.getTime() + 30 * 1000)
      })

      // COMPROBAR SI LA IP TIENE DATOS, SI NO, CREAMOS
      const ipInfo = new IP()
      await ipInfo.findByIP(ip)

      if (!ipInfo.get('_id')) await ipInfo.createFromAPI(ip)
    }

    // Guardar
    await this.update({ access })
  }

  /* FUNCIONES STATICAS */
  static async isGhost(id){
    const result = await this.model.findOne({ _id: id })
    if (result.email) return false
    return true
  }

  static async countUsers(days) {
    const model = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))

    if (!days) {
      return await model.countDocuments()
    }

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    return await model.countDocuments({ createdOn: { $gte: sinceDate } })
  }

  static async avgVisitTimeLastMonth() {
    const model = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - 7)

    const users = await model.find()

    let totalTime = 0
    let totalVisits = 0

    users.forEach(user => {
      const access = user.access || []

      access.forEach(entry => {
        const start = new Date(entry.start)
        const end = new Date(entry.end)

        // Contar solo sesiones que comenzaron o terminaron en los últimos 30 días
        if (
          (!isNaN(start) && start >= sinceDate) ||
          (!isNaN(end) && end >= sinceDate)
        ) {
          const duration = end - start
          if (!isNaN(duration) && duration > 0) {
            totalTime += duration
            totalVisits++
          }
        }
      })
    })

    if (totalVisits === 0) return 0

    const avgMs = totalTime / totalVisits
    const avgSeconds = Math.round(avgMs / 1000)

    return avgSeconds
  }
}

module.exports = user
