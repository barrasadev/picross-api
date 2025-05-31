module.exports = {
  username: { type: String, required: true },
  password: { type: String, required: true, default: '123321AXD' },
  email: { type: String },
  image: {
    type: String,
    default: 'https://playpicross.com/img/picross.ico'
  },
  avgTime: { type: Number },
  access: {
    type: Array,
    default: [],
    schema: {
      ip: { type: String, required: true },
      userAgent: { type: String },
      start: { type: Date, required: true, default: () => new Date() },
      end: { type: Date }
    }
  },
  puzzles: {
    type: Array,
    default: [],
    schema: {
      seed: { type: String, required: true },
      completionTime: { type: String, required: true },
      errorsCount: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      points: { type: Number, required: true },
      dateCompleted: { type: Date, default: () => new Date() }
    }
  },
  createdOn: {
    type: Date,
    default: () => new Date()
  },
  isAdmin: { type: Boolean, default: false },
  referrer: { type: String }
}
