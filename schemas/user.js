module.exports = {
  username: { type: String, required: true },
  password: { type: String, required: true, default: '123321AXD' },
  email: { type: String },
  image: {
    type: String,
    default: 'https://playpicross.com/img/picross.ico'
  },
  access: {
    type: Array,
    default: [],
    schema: {
      ip: { type: String, required: true },
      start: { type: Date, required: true, default: () => new Date() },
      end: { type: Date }
    }
  },
  createdOn: {
    type: Date,
    default: () => new Date()
  },
  isAdmin: { type: Boolean, default: false }
}
