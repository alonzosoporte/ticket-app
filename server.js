const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// ================= CONFIG =================
app.use(express.json({ limit: '20mb' }))
app.use(express.static('public'))

// ================= AUTH =================
const USER = 'alonzo'
const PASS = 'foofigh1987'
const TOKEN = 'alonzo-123'

// LOGIN
app.post('/login', (req,res)=>{
  const { usuario, clave } = req.body

  if(usuario === USER && clave === PASS){
    return res.json({ ok:true, token: TOKEN })
  }

  res.status(401).json({ error:'Credenciales incorrectas' })
})

// MIDDLEWARE AUTH
function auth(req,res,next){

  const authHeader = req.headers.authorization

  if(!authHeader){
    return res.status(401).json({ error:'No autorizado' })
  }

  const token = authHeader.split(' ')[1]

  if(token !== TOKEN){
    return res.status(403).json({ error:'Token inválido' })
  }

  next()
}

// ================= MONGODB =================
mongoose.connect('mongodb+srv://alonzosoporte:Foofigh1987!@cluster0.mafkjzo.mongodb.net/ticketsDB')
.then(()=> console.log('Mongo conectado'))
.catch(err => console.log(err))

// ================= SCHEMAS =================

// 🎫 TICKETS
const TicketSchema = new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  descripcion: String,
  detalle: String,
  precio: String,
  ganancia: String,
  estado: String,
  entregado: String,
  fecha: { type: Date, default: Date.now }
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// 📊 COTIZACIONES
const CotizacionSchema = new mongoose.Schema({
  nombre: String,
  celular: String,
  producto: String,
  proveedor: String,
  costoProveedor: String,
  precioCliente: String,
  ganancia: Number,
  descripcion: String,
  fotos: [String],
  foto: String,
  garantiaHasta: String,
  fotoGarantia: String,
  confirmada: { type: String, default: 'no' },
  fecha: { type: Date, default: Date.now }
})

const Cotizacion = mongoose.models.Cotizacion || mongoose.model('Cotizacion', CotizacionSchema)

// 🏢 PROVEEDORES
const ProveedorSchema = new mongoose.Schema({
  nombre: { type: String, unique: true }
})

const Proveedor = mongoose.models.Proveedor || mongoose.model('Proveedor', ProveedorSchema)

// 🔢 CONTADOR
const CounterSchema = new mongoose.Schema({
  nombre: String,
  valor: Number
})

const Counter = mongoose.model('Counter', CounterSchema)

// ================= SOCKET =================
io.on('connection', () => {
  console.log('Cliente conectado')
})

// ================= TICKETS =================

// CREAR
app.post('/ticket', auth, async (req, res) => {
  try {

    const { nombre, telefono, problema } = req.body

    if (!nombre || !telefono || !problema) {
      return res.json({ error: 'Faltan datos' })
    }

    const cantidad = await Ticket.countDocuments()

    let numero = 1

    if (cantidad === 0) {
      await Counter.findOneAndUpdate(
        { nombre: 'ticket' },
        { valor: 1 },
        { upsert: true }
      )
    } else {
      let contador = await Counter.findOneAndUpdate(
        { nombre: 'ticket' },
        { $inc: { valor: 1 } },
        { new: true, upsert: true }
      )
      numero = contador.valor
    }

    const numeroFormateado = 'Ticket-' + numero.toString().padStart(3, '0')

    const nuevo = new Ticket({
      ...req.body,
      numero: numeroFormateado,
      estado: 'pendiente',
      entregado: 'no',
      fecha: new Date()
    })

    await nuevo.save()

    io.emit('actualizar')
    res.json(nuevo)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creando ticket' })
  }
})

// LISTAR
app.get('/tickets', auth, async (req, res) => {
  const data = await Ticket.find().sort({ _id: -1 })
  res.json(data)
})

// ACTUALIZAR
app.put('/ticket/:numero', auth, async (req, res) => {
  const actualizado = await Ticket.findOneAndUpdate(
    { numero: req.params.numero },
    { $set: req.body },
    { new: true }
  )

  io.emit('actualizar')
  res.json(actualizado)
})

// BORRAR
app.delete('/ticket/:numero', auth, async (req, res) => {
  await Ticket.findOneAndDelete({ numero: req.params.numero })
  io.emit('actualizar')
  res.json({ ok: true })
})

// ================= COTIZACIONES =================

// CREAR
app.post('/cotizacion', auth, async (req, res) => {
  try {

    const {
      nombre,
      celular,
      producto,
      proveedor,
      costoProveedor,
      precioCliente,
      descripcion
    } = req.body

    if (
      !nombre?.trim() ||
      !celular?.trim() ||
      !producto?.trim() ||
      !proveedor?.trim() ||
      !costoProveedor?.toString().trim() ||
      !precioCliente?.toString().trim() ||
      !descripcion?.trim()
    ) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' })
    }

    const costo = parseFloat(costoProveedor) || 0
    const precio = parseFloat(precioCliente) || 0

    const nueva = new Cotizacion({
      ...req.body,
      ganancia: precio - costo
    })

    await nueva.save()

    res.json({ ok: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creando cotizacion' })
  }
})

// LISTAR
app.get('/cotizaciones', auth, async (req, res) => {
  const data = await Cotizacion.find().sort({ _id: -1 })
  res.json(data)
})

// GARANTÍAS
app.get('/garantias', auth, async (req, res) => {
  try {
    const data = await Cotizacion.find({ confirmada: 'si' }).sort({ _id: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo garantías' })
  }
})

// ACTUALIZAR
app.put('/cotizacion/:id', auth, async (req, res) => {
  try {

    const data = req.body

    if (data.confirmada === 'si') {
      const costo = parseFloat(data.costoProveedor) || 0
      const precio = parseFloat(data.precioCliente) || 0
      data.ganancia = precio - costo
    }

    await Cotizacion.findByIdAndUpdate(req.params.id, { $set: data })

    io.emit('actualizar')
    res.json({ ok: true })

  } catch (err) {
    res.status(500).json({ error: 'Error actualizando cotización' })
  }
})

// GARANTÍA
app.put('/garantia/:id', auth, async (req, res) => {
  try {

    const { garantiaHasta, fotoGarantia } = req.body

    const update = {}

    if (garantiaHasta !== undefined) update.garantiaHasta = garantiaHasta
    if (fotoGarantia !== undefined) update.fotoGarantia = fotoGarantia

    await Cotizacion.findByIdAndUpdate(req.params.id, {
      $set: update
    })

    res.json({ ok: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error actualizando garantía' })
  }
})

// BORRAR
app.delete('/cotizacion/:id', auth, async (req, res) => {
  await Cotizacion.findByIdAndDelete(req.params.id)
  io.emit('actualizar')
  res.json({ ok: true })
})

// ================= PROVEEDORES =================

app.get('/proveedores', auth, async (req, res) => {
  const data = await Proveedor.find().sort({ nombre: 1 })
  res.json(data)
})

app.post('/proveedores', auth, async (req, res) => {

  const nombre = req.body.nombre?.trim()

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre requerido' })
  }

  const existe = await Proveedor.findOne({ nombre })

  if (existe) return res.json({ ok: true })

  const nuevo = new Proveedor({ nombre })
  await nuevo.save()

  res.json({ ok: true })
})

app.delete('/proveedores/:nombre', auth, async (req, res) => {
  await Proveedor.deleteOne({ nombre: req.params.nombre })
  res.json({ ok: true })
})

// ================= START =================
const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log('Servidor corriendo en puerto', PORT)
})