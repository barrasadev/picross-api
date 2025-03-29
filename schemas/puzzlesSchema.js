module.exports = {
  puzzles: {
    type: Array,
    required: true,
    schema: {
      id: String,
      seed: String,
      completionTime: Number,
      errorsCount: Number,
      width: Number,
      height: Number,
      points: Number,
      dateCompleted: { type: Date, default: () => new Date() },
      userId: String
    }
  }
}