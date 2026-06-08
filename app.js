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
// 2. LÓGICA DE HORARIOS Y BLOQUEOS (ALGORITMO)
// ==========================================
const fechaInput = document.getElementById('fecha');
const servicioSelect = document.getElementById('servicio');
const horarioSelect = document.getElementById('horario');

// Bloquear fechas pasadas en el calendario
const hoy = new Date().toISOString().split('T')[0];
fechaInput.min = hoy;

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
    
    // Jornada laboral expresada directamente en minutos enteros
    let horaInicioJornada = 600; // 10:00 hs en minutos (10 * 60)
    const horaFinJornada = 900;  // 15:00 hs en minutos (15 * 60)

    /* BASE DE DATOS REAL:
       Arranca vacío. Aquí es donde en una segunda etapa conectarás la lectura 
       en tiempo real de los turnos ocupados desde tu base de datos o API.
    */
    const turnosOcupados = [];

    // OBTENER FECHA Y HORA ACTUAL (ZONA HORARIA LOCAL)
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaHoyString = `${anio}-${mes}-${dia}`; // Formato YYYY-MM-DD
    
    // Convertir hora del reloj actual a minutos totales transcurridos en el día
    const minutosActuales = (ahora.getHours() * 60) + ahora.getMinutes();

    let hayHorariosTotales = false;

    while (horaInicioJornada + duracionServicioNuevo <= horaFinJornada) {
        
        // 1. Comprobar si colisiona con turnos ocupados agendados
        let estaOcupado = turnosOcupados.some(turno => {
            return (horaInicioJornada >= turno.inicio && horaInicioJornada < turno.fin) || 
                   (horaInicioJornada + duracionServicioNuevo > turno.inicio && horaInicioJornada + duracionServicioNuevo <= turno.fin);
        });

        // 2. RESTRICCIÓN DE TIEMPO REAL (Solo afecta si eligen el día de HOY)
        if (fechaInput.value === fechaHoyString) {
            // Regla A: Bloquear horas que cronológicamente ya pasaron en el reloj
            if (horaInicioJornada <= minutosActuales) {
                estaOcupado = true;
            }
            // Regla B: Impedir reservas si falta menos de 1 hora (60 min) para el cierre definitivo
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
            hayHorariosTotales = true; // Registra que al menos hay una opción libre real
        }

        horarioSelect.appendChild(option);
        horaInicioJornada += duracionServicioNuevo; 
    }

    // Validación de interfaz según la disponibilidad
    if (hayHorariosTotales) {
        horarioSelect.disabled = false;
    } else {
        horarioSelect.disabled = true;
        horarioSelect.innerHTML = '<option value="">Sin turnos disponibles para hoy</option>';
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
// 4. ENVÍO DEL FORMULARIO A TRAVÉS DE WEBHOOK
// ==========================================
document.getElementById('turnoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const btnConfirmar = document.getElementById('btnConfirmar');
    const opcionSeleccionada = servicioSelect.options[servicioSelect.selectedIndex];
    
    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Procesando reserva...";

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
            alert(`¡Turno reservado con éxito! Se ha enviado un correo de confirmación a ${datosTurno.email}.`);
            document.getElementById('turnoForm').reset(); 
            horarioSelect.disabled = true;
            planSelect.disabled = true;
        } else {
            alert("Hubo un problema al procesar el turno. Por favor, intenta nuevamente.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error de conexión. Inténtalo más tarde.");
    })
    .finally(() => {
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "Confirmar Reserva";
    });
});