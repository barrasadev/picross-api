class superClass {
  constructor() {
  }

  set(data = {}) {
    Object.assign(this, data)
  }

  get(param) {
    if (!param) return this
    return this[param]
  }

  async update(data = {}) {
    const id = this.get('_id')
    if (!id) throw new Error('No _id definido para update()')

    // Actualiza en Mongo
    await this.model.updateOne({ _id: id }, { $set: data })

    // Actualiza internamente
    this.set({ ...this.get(), ...data })

    return this.get()
  }

}

module.exports = superClass