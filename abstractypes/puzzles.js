const superClass = require('./superClass')
const userSchema = require('../schemas/user')
const mongoose = require('mongoose')

class puzzles extends superClass {
  constructor() {
    super()
    this.schema = userSchema
    this.model = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))
  }

  static async $getCountAllPuzzles() {
    try {
      const model = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))
      const result = await model.aggregate([
        { $unwind: '$puzzles' },
        { $group: { _id: null, total: { $sum: 1 } } }
      ])

      return result.length > 0 ? result[0].total : 0
    } catch (err) {
      console.error('❌ Error al contar puzzles:', err.message)
      return 0
    }
  }
}

module.exports = puzzles