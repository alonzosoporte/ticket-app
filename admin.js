const socket = io()
socket.on('actualizar', () => {
  console.log("🔄 Actualizando en tiempo real...")
  cargar()
})
let modo = "pendientes"

socket.on('actualizar', () => {
  cargar()
})

function verPendientes() {
  modo = "pendientes"
  cargar()
}

function verTodos() {
  modo = "todos"
  cargar()
}

async function cargar() {

  const res = await fetch('/tickets')
  const tickets = await res.json()

  console.log("TICKETS:", tickets)

  const lista = document.getElementById('lista')
  lista.innerHTML = ""

  const texto = document.getElementById("buscador").value
    .toLowerCase()
    .trim()

  console.log("BUSCANDO:", texto)

  let filtrados = tickets.filter(t => {

    const nombre = (t.nombre || "").toString().toLowerCase()
    const telefono = (t.telefono || "").toString()
    const numero = (t.numero || "").toString().toLowerCase()
    const problema = (t.problema || "").toString().toLowerCase()
    

    return (
      nombre.includes(texto) ||
      telefono.includes(texto) ||
      numero.includes(texto) ||
      problema.includes(texto)
    )
  })

  console.log("FILTRADOS:", filtrados)

  if (modo === "pendientes") {
    filtrados = filtrados.filter(t =>
      !t.estado || !t.estado.toLowerCase().includes("reparado")
    )
  }

  filtrados.forEach(t => {

    const div = document.createElement('div')
    div.className = 'ticket'

    div.innerHTML =
      "<h3>" + t.numero + "</h3>" +
      "<p>" + t.nombre + "</p>"

    lista.appendChild(div)
  })
}

// 🔧 REPARADO
async function marcarReparado(numero, telefono, nombre) {

  const precio = document.getElementById(precio-${numero}).value
  const detalle = document.getElementById(detalle-${numero}).value

  await fetch(/ticket/${numero}, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      estado: 'reparado',
      precio,
      detalle
    })
  })

  const tel = telefono.replace(/\D/g, '')

  const mensaje = `Hola ${nombre}, su equipo ya está reparado.

Ticket: ${numero}
Detalle: ${detalle}
Precio: $${precio}

Puede pasar a retirarlo.`

  const url = https://wa.me/598${tel}?text=${encodeURIComponent(mensaje)}

  window.open(url, "_blank")
}

// 🗑 BORRAR
async function borrar(numero) {

  if (!confirm("¿Borrar ticket?")) return

  await fetch(/ticket/${numero}, {
    method: 'DELETE'
  })
}

cargar()