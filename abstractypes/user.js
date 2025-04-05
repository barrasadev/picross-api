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

  async create({ username, email, password, referrer } = {}) {
    if (!username) {
      const random = Math.floor(1000 + Math.random() * 9000)
      username = `PicrossUser${random}`
    }

    const userData = { username }
    if (email) userData.email = email
    if (password) userData.password = password
    if (referrer) userData.referrer = referrer

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

  async registerActivity(ip, userAgent) {
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
        userAgent,
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

  async loginUser(email, password){
    const result = await this.model.findOne({ email, password })
    return result?._id || null
  }

  async migrateFrom(id) {
    if (!id) return false

    const oldUser = await this.model.findOne({ _id: id })
    if (!oldUser) return false

    const currentAccess = this.get('access') || []
    const oldAccess = oldUser.access || []

    // Mezclar accesos
    const mergedAccess = [...currentAccess, ...oldAccess]

    // Actualizar el usuario actual
    await this.update({ access: mergedAccess })

    // Eliminar el usuario antiguo
    await this.model.deleteOne({ _id: id })
  }

  /* FUNCIONES STATICAS */
  static async isGhost(id) {
    const tempUser = new this() // o: new User()
    const result = await tempUser.model.findOne({ _id: id })
    if (!result || result?.email) return false
    return true
  }

}

module.exports = user
