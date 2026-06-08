// ==========================================
// 1. MAPEO DE OBRAS SOCIALES Y PLANES
// ==========================================
const planesPorOS = {
    osde: ["OSDE 210", "OSDE 310", "OSDE 410", "OSDE 510"],
    swiss: ["SMG20", "SMG30", "SMG50"],
    particular: ["Sin Plan (Particular)"]
};

const osSelect = document.getElementById('obraSocial');
const planSelect = document.getElementById('plan');

osSelect.addEventListener('change', function() {
    const osSeleccionada = this.value;
    planSelect.innerHTML = '<option value="">Seleccione...</option>';
    
    if (osSeleccionada && planesPorOS[osSeleccionada]) {
        planSelect.disabled = false;
        planesPorOS[osSeleccionada].forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.toLowerCase().replace(/ /g, "-");
            option.textContent = plan;
            planSelect.appendChild(option);
        });
    } else {
        planSelect.disabled = true;
        planSelect.innerHTML = '<option value="">Seleccione Obra Social</option>';
    }
});

// ==========================================
// 2. LÓGICA DE HORARIOS, BLOQUEOS Y FILTROS
// ==========================================
const fechaInput = document.getElementById('fecha');
const servicioSelect = document.getElementById('servicio');
const horarioSelect = document.getElementById('horario');

// Bloquear fechas pasadas en el calendario nativo
const hoy = new Date().toISOString().split('T')[0];
fechaInput.min = hoy;

// Validar que no se seleccionen fines de semana (Sábados ni Domingos)
fechaInput.addEventListener('input', function() {
    if (!this.value) return;
    
    const fechaSeleccionada = new Date(this.value + 'T00:00:00');
    const diaSemana = fechaSeleccionada.getDay(); // 0 = Domingo, 6 = Sábado

    if (diaSemana === 0 || diaSemana === 6) {
        alert("El consultorio médico atiende exclusivamente de Lunes a Viernes. Por favor, seleccione un día laboral.");
        this.value = ""; 
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
    }
});

fechaInput.addEventListener('change', generarHorariosDisponibles);
servicioSelect.addEventListener('change', generarHorariosDisponibles);

function generarHorariosDisponibles() {
    if (!fechaInput.value || !servicioSelect.value) {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
        return;
    }

    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    const duracionServicioNuevo = parseInt(opcionSeleccionada.getAttribute('data-duracion'));
    horarioSelect.innerHTML = '<option value="">Seleccione un horario...</option>';
    
    // Jornada laboral continua (De corrido)
    let horaInicioJornada = 600; // 10:00 hs (10 * 60)
    const horaFinJornada = 900;  // 15:00 hs (15 * 60)

    /* BASE DE DATOS LOCAL
       Espacio reservado para inyectar los rangos ocupados dinámicos en la Etapa 2.
    */
    const turnosOcupados = [];

    // Capturar fecha y hora actual del sistema del cliente
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaHoyString = `${anio}-${mes}-${dia}`; 
    
    const minutosActuales = (ahora.getHours() * 60) + ahora.getMinutes();
    let hayHorariosTotales = false;

    while (horaInicioJornada + duracionServicioNuevo <= horaFinJornada) {
        
        // Regla 1: Colisión con turnos ya agendados en la simulación
        let estaOcupado = turnosOcupados.some(turno => {
            return (horaInicioJornada >= turno.inicio && horaInicioJornada < turno.fin) || 
                   (horaInicioJornada + duracionServicioNuevo > turno.inicio && horaInicioJornada + duracionServicioNuevo <= turno.fin);
        });

        // Reglas de seguridad aplicables exclusivamente si se reserva para el mismo día de HOY
        if (fechaInput.value === fechaHoyString) {
            // Regla 2: Ocultar horas que ya pasaron en el reloj
            if (horaInicioJornada <= minutosActuales) {
                estaOcupado = true;
            }
            // Regla 3: Restricción de 1 hora de anticipación antes del cierre definitivo de la jornada
            if (horaInicioJornada > (horaFinJornada - 60)) {
                estaOcupado = true;
            }
        }

        let hrs = Math.floor(horaInicioJornada / 60);
        let mins = horaInicioJornada % 60;
        let tiempoFormateado = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = tiempoFormateado;

        if (estaOcupado) {
            option.textContent = `${tiempoFormateado} hs (No disponible)`;
            option.disabled = true;
            option.style.color = "#94a3b8"; 
        } else {
            option.textContent = `${tiempoFormateado} hs`;
            hayHorariosTotales = true;
        }

        horarioSelect.appendChild(option);
        horaInicioJornada += duracionServicioNuevo; 
    }

    if (hayHorariosTotales) {
        horarioSelect.disabled = false;
    } else {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Sin turnos disponibles para este día</option>';
    }
}

// ==========================================
// 3. RESTRICCIONES DE ESCRITURA EN TIEMPO REAL
// ==========================================
const nombreInput = document.getElementById('nombre');
const telefonoInput = document.getElementById('telefono');
const emailInput = document.getElementById('email');

nombreInput.addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
});

telefonoInput.addEventListener('input', function() {
    let valor = this.value;
    if (valor.startsWith('+')) {
        this.value = '+' + valor.slice(1).replace(/[^0-9]/g, '');
    } else {
        this.value = valor.replace(/[^0-9]/g, '');
    }
});

emailInput.addEventListener('input', function() {
    this.value = this.value.replace(/\s/g, '');
});

// ==========================================
// 4. ENVÍO DEL FORMULARIO A TRAVÉS DE WEBHOOK (MAKE.COM)
// ==========================================
document.getElementById('turnoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // CANDADO DE SEGURIDAD EXTRA: Validar extensión de email de forma manual antes de enviar
    const emailValidoRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com\.ar|com|ar)$/;
    if (!emailValidoRegEx.test(emailInput.value)) {
        alert("Error: El correo electrónico debe terminar estrictamente en .com, .com.ar o .ar");
        emailInput.focus();
        return; // Frena el código por completo y no envía nada a Make
    }
    
    const btnConfirmar = document.getElementById('btnConfirmar');
    const btnTexto = document.getElementById('btnTexto');
    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    
    // Bloqueo estético anti doble clic
    btnConfirmar.disabled = true;
    btnConfirmar.style.backgroundColor = "#94a3b8";
    btnConfirmar.style.cursor = "not-allowed";
    btnTexto.innerText = "Procesando reserva... Por favor espere";

    const datosTurno = {
        nombre: nombreInput.value,
        telefono: telefonoInput.value,
        email: emailInput.value,
        servicio: servicioSelect.options[servicioSelect.selectedIndex].text, 
        duracion: parseInt(opcionSeleccionada.getAttribute('data-duracion')), 
        obraSocial: osSelect.value.toUpperCase(),
        plan: planSelect.options[planSelect.selectedIndex].text,
        fecha: fechaInput.value,
        horario: horarioSelect.value,
        comentarios: document.getElementById('comentarios').value
    };

    const urlWebhookMake = "https://hook.eu1.make.com/hp1k5ih8o8u86v9ri9yfypknuwjacajr";

    fetch(urlWebhookMake, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosTurno)
    })
    .then(response => {
        if (response.ok) {
            alert(`¡Turno reservado con éxito!\nSe ha enviado un correo electrónico de confirmación a ${datosTurno.email}.`);
            document.getElementById('turnoForm').reset(); 
            horarioSelect.disabled = true;
            planSelect.disabled = true;
        } else {
            alert("Hubo un problema al procesar el turno. Por favor, intenta nuevamente.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error de conexión con el servidor. Inténtalo más tarde.");
    })
    .finally(() => {
        // Restaurar botón a su estado original
        btnConfirmar.disabled = false;
        btnConfirmar.style.backgroundColor = ""; 
        btnConfirmar.style.cursor = "pointer";
        btnTexto.innerText = "Confirmar Reserva";
    });
});