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

  async getCountAllPuzzles() {
    try {
      const result = await this.model.aggregate([
        { $unwind: { path: '$puzzles', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, total: { $sum: 1 } } }
      ])

      return result.length > 0 ? result[0].total : 0
    } catch (err) {
      console.error('❌ Error al contar puzzles:', err.message)
      return 0
    }
  }
}

module.exports = Admin