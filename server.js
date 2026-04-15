const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err))
const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.static('public'))

let ticketsLocal = []

io.on('connection', () => {
  console.log('Cliente conectado')
})

// CREAR
// CREAR
app.post('/ticket', (req, res) => {
  const { nombre, telefono, problema } = req.body

  if (!nombre || !telefono || !problema) {
    return res.json({ error: 'Faltan datos' })
  }

  const numero = "T-" + new Date().getFullYear() + "-" + (ticketsLocal.length + 1).toString().padStart(4, '0')

  const ahora = new Date()

  const nuevo = {
  numero,
  nombre,
  telefono,
  problema,
  estado: 'pendiente',
  precio: '',
  ganancia: '',
  detalle: '',
  entregado: 'no',
  fecha: ahora.toISOString()
}

  ticketsLocal.push(nuevo)

  io.emit('actualizar')

  res.json({ ok: true, numero })
})

// LISTAR
app.get('/tickets', (req, res) => {
  res.json(ticketsLocal)
})

// ACTUALIZAR
app.put('/ticket/:numero', (req, res) => {
  const numero = req.params.numero
  const update = req.body

  ticketsLocal = ticketsLocal.map(t =>
    t.numero === numero ? { ...t, ...update } : t
  )

  io.emit('actualizar')
  res.json({ ok: true })
})

// BORRAR
app.delete('/ticket/:numero', (req, res) => {
  const numero = req.params.numero

  ticketsLocal = ticketsLocal.filter(t => t.numero !== numero)

  io.emit('actualizar')
  res.json({ ok: true })
})

http.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})