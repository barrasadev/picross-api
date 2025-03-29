const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/mongo')

const app = express()
app.use(express.json())
app.use(cors())

connectDB()

// ⬇️ Asegúrate de tener esta línea:
app.use('/users', require('./routes/users'))
app.set('trust proxy', true)


// Ruta base por defecto
app.use('/', (req, res) => {
  res.json({ message: 'API funcionando en /' })
})

const PORT = process.env.PORT || 3005
app.listen(PORT, () => {
  console.log(`🚀 - Servidor funcionando en http://localhost:${PORT}/`)
})