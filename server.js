const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err))

// =======================
// 📦 TICKETS
// =======================
const TicketSchema = new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  estado: String,
  precio: String,
  ganancia: String,
  detalle: String,
  entregado: String,
  fecha: Date,
  garantiaFecha: Date,   // 🔥 NUEVO
  garantiaFoto: String   // 🔥 NUEVO
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// =======================
// 📦 COTIZACIONES
// =======================
const CotizacionSchema = new mongoose.Schema({
  nombre: String,
  celular: String,
  producto: String,
  proveedor: String,
  costoProveedor: String,
  precioCliente: String,
  ganancia: Number,
  confirmada: { type: String, default: 'no' },
  descripcion: String,
  foto: String,
  garantiaFecha: Date,
  garantiaFoto: String,
  fecha: Date
})

const Cotizacion = mongoose.model('Cotizacion', CotizacionSchema)

// =======================
// 📦 PROVEEDOR
// =======================
const ProveedorSchema = new mongoose.Schema({
  nombre: String
})

const Proveedor = mongoose.model('Proveedor', ProveedorSchema)

// =======================
app.use(express.json({ limit: '10mb' }))
app.use(express.static('public'))

io.on('connection', () => console.log('Cliente conectado'))

// =======================
// 🧾 TICKETS
// =======================
app.post('/ticket', async (req, res) => {

  const { nombre, telefono, problema } = req.body

  if (!nombre || !telefono || !problema) {
    return res.json({ error: 'Faltan datos' })
  }

  const año = new Date().getFullYear()
  const contador = await Ticket.countDocuments()

  const numero = "T-" + año + "-" + (contador + 1).toString().padStart(4, '0')

  const nuevo = new Ticket({
    numero,
    nombre,
    telefono,
    problema,
    estado: 'pendiente',
    precio: '',
    ganancia: '',
    detalle: '',
    entregado: 'no',
    fecha: new Date()
  })

  await nuevo.save()
  io.emit('actualizar')

  res.json({ ok: true, numero })
})

app.get('/tickets', async (req, res) => {
  const data = await Ticket.find()
  res.json(data)
})

app.put('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndUpdate({ numero: req.params.numero }, req.body)
  io.emit('actualizar')
  res.json({ ok: true })
})

app.delete('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndDelete({ numero: req.params.numero })
  io.emit('actualizar')
  res.json({ ok: true })
})

// =======================
// 📊 COTIZACIONES
// =======================
app.post('/cotizacion', async (req, res) => {

  const {
    nombre, celular, producto, proveedor,
    costoProveedor, precioCliente,
    descripcion, foto,
    garantiaFecha, garantiaFoto
  } = req.body

  const costo = parseFloat(costoProveedor) || 0
  const precio = parseFloat(precioCliente) || 0

  const nueva = new Cotizacion({
    nombre,
    celular,
    producto,
    proveedor,
    costoProveedor,
    precioCliente,
    ganancia: precio - costo,
    confirmada: 'no',
    descripcion,
    foto,
    garantiaFecha,
    garantiaFoto,
    fecha: new Date()
  })

  await nueva.save()
  res.json({ ok: true })
})

app.get('/cotizaciones', async (req, res) => {
  const data = await Cotizacion.find()
  res.json(data)
})

app.put('/cotizacion/:id', async (req, res) => {

  const actual = await Cotizacion.findById(req.params.id)

  if (actual.confirmada === 'si') {
    return res.status(400).json({ error: 'No editable' })
  }

  const costo = parseFloat(req.body.costoProveedor) || 0
  const precio = parseFloat(req.body.precioCliente) || 0

  req.body.ganancia = precio - costo

  await Cotizacion.findByIdAndUpdate(req.params.id, req.body)

  res.json({ ok: true })
})

app.delete('/cotizacion/:id', async (req, res) => {
  await Cotizacion.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

// =======================
// 🔥 CONFIRMAR
// =======================
app.put('/cotizacion/confirmar/:id', async (req, res) => {

  const c = await Cotizacion.findById(req.params.id)

  if (!c) return res.sendStatus(404)

  if (c.confirmada === 'si') {
    return res.status(400).json({ msg: 'Ya confirmada' })
  }

  const costo = parseFloat(c.costoProveedor) || 0
  const precio = parseFloat(c.precioCliente) || 0
  const ganancia = precio - costo

  c.confirmada = 'si'
  c.ganancia = ganancia

  await c.save()

  await Ticket.create({
    numero: 'VENTA-' + Date.now(),
    nombre: c.nombre,
    telefono: c.celular,
    problema: 'Venta: ' + c.producto,
    precio: c.precioCliente,
    ganancia: ganancia,
    estado: 'listo',
    entregado: 'si',
    fecha: new Date(),
    garantiaFecha: c.garantiaFecha,   // 🔥 PASA GARANTÍA
    garantiaFoto: c.garantiaFoto
  })

  io.emit('actualizar')
  res.json({ ok: true })
})

// =======================
// 🏭 PROVEEDORES
// =======================
app.get('/proveedores', async (req, res) => {
  res.json(await Proveedor.find())
})

app.post('/proveedores', async (req, res) => {
  const { nombre } = req.body
  if (!nombre) return res.json({ error: 'Falta nombre' })

  const existe = await Proveedor.findOne({ nombre })
  if (existe) return res.json({ error: 'Ya existe' })

  await new Proveedor({ nombre }).save()
  res.json({ ok: true })
})

// =======================
server.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})