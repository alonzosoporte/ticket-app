console.log("ADMIN OK")

const socket = io()

let modo = "pendientes"

// 🎯 BOTONES
document.addEventListener("DOMContentLoaded", () => {

  const btnPendientes = document.getElementById("btnPendientes")
  const btnTodos = document.getElementById("btnTodos")

  btnPendientes.onclick = () => {
    modo = "pendientes"
    actualizarBotones()
    cargar()
  }

  btnTodos.onclick = () => {
    modo = "todos"
    actualizarBotones()
    cargar()
  }

  actualizarBotones()
  cargar()
})

// 🎨 BOTÓN ACTIVO
function actualizarBotones() {
  const btnPendientes = document.getElementById("btnPendientes")
  const btnTodos = document.getElementById("btnTodos")

  btnPendientes.classList.remove("activo")
  btnTodos.classList.remove("activo")

  if (modo === "pendientes") btnPendientes.classList.add("activo")
  else btnTodos.classList.add("activo")
}

// 🚀 CARGAR
async function cargar() {

  const res = await fetch('/tickets')
  let tickets = await res.json()

  const lista = document.getElementById("lista")
  lista.innerHTML = ""

  // 🔥 NUEVOS ARRIBA
  tickets.reverse()

  tickets.forEach(t => {

    const estado = (t.estado || "").toLowerCase()

    if (modo === "pendientes" && estado.includes("reparado")) return

    const estadoClass =
      estado.includes("reparado") ? "reparado" :
      estado.includes("proceso") ? "proceso" :
      "pendiente"

    lista.innerHTML += `
      <div class="card ${estadoClass}">
        
        <b>${t.nombre}</b><br>
        🧾 ${t.numero}<br>
        📞 ${t.telefono}<br>
        🛠 ${t.problema}

        <br><br>

        💲 Precio
        <input type="number" id="precio-${t.numero}" value="${t.precio || ''}">

        🧾 Detalle
        <input type="text" id="detalle-${t.numero}" value="${t.detalle || ''}">

        📌 Estado
        <select id="estado-${t.numero}">
          <option ${estado.includes("pendiente")?"selected":""}>pendiente</option>
          <option ${estado.includes("proceso")?"selected":""}>en proceso</option>
          <option ${estado.includes("reparado")?"selected":""}>reparado</option>
        </select>

        <div class="acciones">
          <button class="btn-verde" onclick="guardar('${t.numero}','${t.telefono}','${t.nombre}')">💾</button>
          <button class="btn-rojo" onclick="borrar('${t.numero}')">🗑</button>
          <button class="btn-azul" onclick="whatsapp('${t.telefono}','${t.nombre}','${t.numero}')">📲</button>
        </div>

      </div>
    `
  })
}

// 💾 GUARDAR
window.guardar = async function(numero, telefono, nombre) {

  const estado = document.getElementById("estado-" + numero).value
  const precio = document.getElementById("precio-" + numero).value
  const detalle = document.getElementById("detalle-" + numero).value

  await fetch('/ticket/' + numero, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, precio, detalle })
  })

  // 📲 SI REPARADO
  if (estado.toLowerCase().includes("reparado")) {

    let tel = telefono.replace(/\D/g, '')
    if (!tel.startsWith("598")) tel = "598" + tel

    const mensaje = `Hola ${nombre},
Su equipo está reparado y listo para retirar.

Ticket: ${numero}`

    const url = "https://wa.me/" + tel + "?text=" + encodeURIComponent(mensaje)

    setTimeout(() => {
      if (confirm("¿Enviar WhatsApp?")) {
        window.open(url, "_blank")
      }
    }, 300)
  }

  setTimeout(() => {
    cargar()
  }, 200)
}

// 🗑 BORRAR
window.borrar = async function(numero) {
  if (!confirm("¿Seguro borrar?")) return

  await fetch('/ticket/' + numero, { method: 'DELETE' })
  cargar()
}

// 📲 WHATSAPP
window.whatsapp = function(telefono, nombre, numero) {

  let tel = telefono.replace(/\D/g, '')
  if (!tel.startsWith("598")) tel = "598" + tel

  const mensaje = `Hola ${nombre}, su equipo está listo.
Ticket: ${numero}`

  window.open("https://wa.me/" + tel + "?text=" + encodeURIComponent(mensaje))
}

// 🔄 TIEMPO REAL
socket.on('actualizar', () => {
  cargar()
})