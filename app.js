// ==========================================
// 4. ENVÍO DEL FORMULARIO (VALIDADO Y BLINDADO)
// ==========================================
document.getElementById('turnoForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Detenemos el envío inmediato
    
    // --- NUEVA VALIDACIÓN: CORREO (.om) ---
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|ar|com\.ar)$/;
    if (!emailRegex.test(emailInput.value)) {
        alert("Error: El correo no es válido. Debe terminar en .com, .ar o .com.ar");
        emailInput.focus();
        return; // SE DETIENE AQUÍ, NO PASA AL FETCH
    }

    // --- NUEVA VALIDACIÓN: FIN DE SEMANA ---
    const fechaSeleccionada = new Date(fechaInput.value + 'T00:00:00');
    const diaSemana = fechaSeleccionada.getDay(); // 0 es Domingo, 6 es Sábado
    if (diaSemana === 0 || diaSemana === 6) {
        alert("Lo sentimos, no realizamos turnos los fines de semana.");
        fechaInput.value = ""; // Limpiamos la fecha
        return; // SE DETIENE AQUÍ
    }

    // --- SI PASA LAS VALIDACIONES, RECIÉN AHÍ PROCESAMOS ---
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosTurno)
    })
    .then(response => {
        if (response.ok) {
            alert(`¡Turno reservado con éxito!`);
            document.getElementById('turnoForm').reset(); 
            horarioSelect.disabled = true;
        } else {
            alert("Hubo un error en el servidor.");
        }
    })
    .catch(error => alert("Error de conexión."))
    .finally(() => {
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "Confirmar Reserva";
    });
});