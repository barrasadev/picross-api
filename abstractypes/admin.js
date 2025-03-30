const mongoose = require('mongoose')
require('dotenv').config()

class Admin {
  constructor() {
    this.model =
      mongoose.models.User ||
      mongoose.model('User', new mongoose.Schema({}, { strict: false }))
  }

  async countUsers(days) {
    if (!days) {
      return await this.model.countDocuments()
    }

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    return await this.model.countDocuments({ createdOn: { $gte: sinceDate } })
  }

  async avgVisitTimeLastMonth() {
    const users = await this.model.find({ avgTime: { $exists: true, $gt: 0 } })

    if (!users.length) return 0

    const totalTime = users.reduce((sum, user) => sum + user.avgTime, 0)
    const avgSeconds = Math.round(totalTime / users.length)

    return avgSeconds
  }
}

module.exports = Admin