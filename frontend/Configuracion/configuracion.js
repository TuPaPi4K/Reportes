class ConfiguracionManager {
    constructor() {
        this.currentSection = 'empresa';
        this.empresaData = null;
        this.configData = null;
        this.tasaCambioData = null;
        
        
        this.init();
    }

    init() {
        console.log('⚙️ Inicializando módulo de configuración...');
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadEmpresaData();
        this.loadCategorias();
        this.loadConfigNegocio();
        this.loadMetodosPago();
        this.loadBackupHistory();
        
    }

    checkAuthentication() {
        fetch('/api/me', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                window.location.href = '/login.html';
            }
        })
        .catch(error => {
            console.error('Error de autenticación:', error);
            window.location.href = '/login.html';
        });
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Navegación lateral
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length > 0) {
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    this.switchSection(item.dataset.section);
                });
            });
        }

        // Formularios con validación
        const empresaForm = document.getElementById('empresa-form');
        if (empresaForm) {
            empresaForm.addEventListener('submit', (e) => this.handleEmpresaForm(e));
            this.setupFormValidation(empresaForm);
        }

        // Botones
        const addCategoriaBtn = document.getElementById('add-categoria');
        if (addCategoriaBtn) {
            addCategoriaBtn.addEventListener('click', () => this.addCategoria());
        }

        const guardarConfigBtn = document.getElementById('guardar-config-negocio');
        if (guardarConfigBtn) {
            guardarConfigBtn.addEventListener('click', () => this.handleConfigNegocio());
        }

        const createBackupBtn = document.getElementById('create-backup');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => this.createBackup());
        }

        // Event listeners para tasa de cambio
        const actualizarTasaApiBtn = document.getElementById('actualizar-tasa-api');
        if (actualizarTasaApiBtn) {
            actualizarTasaApiBtn.addEventListener('click', () => this.actualizarTasaDesdeAPI());
        }

        const guardarTasaManualBtn = document.getElementById('guardar-tasa-manual');
        if (guardarTasaManualBtn) {
            guardarTasaManualBtn.addEventListener('click', () => this.guardarTasaManual());
        }

        const forzarActualizacionBtn = document.getElementById('forzar-actualizacion');
        if (forzarActualizacionBtn) {
            forzarActualizacionBtn.addEventListener('click', () => this.forzarActualizacionTasa());
        }

        const tasaActivaCheckbox = document.getElementById('tasa-activa');
        if (tasaActivaCheckbox) {
            tasaActivaCheckbox.addEventListener('change', (e) => this.toggleTasaActiva(e.target.checked));
        }

          const desactivarTasaBtn = document.getElementById('desactivar-tasa-manual');
    if (desactivarTasaBtn) {
        desactivarTasaBtn.addEventListener('click', () => this.desactivarTasaManual());
    }

        console.log('✅ Event listeners configurados');
    }

    // ==================== VALIDACIONES DE FORMULARIOS ====================

    setupFormValidation(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    validateField(field) {
        this.clearFieldError(field);
        
        const value = field.value.trim();
        const fieldName = field.id;

        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, `${this.getFieldDisplayName(fieldName)} es obligatorio`);
            return false;
        }

        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(field, 'Ingrese un email válido');
                return false;
            }
        }

        if (field.id === 'empresa-rif' && value) {
            const rifRegex = /^[JGVEP]-?\d{8}-?\d$/;
            if (!rifRegex.test(value.toUpperCase())) {
                this.showFieldError(field, 'Formato de RIF inválido. Ejemplo: J-123456789');
                return false;
            }
        }

        return true;
    }

    getFieldDisplayName(fieldName) {
        const names = {
            'empresa-nombre': 'Nombre de la empresa',
            'empresa-rif': 'RIF'
        };
        return names[fieldName] || 'Este campo';
    }

    showFieldError(field, message) {
        field.classList.add('error');
        const errorDiv = document.getElementById(`error-${field.id}`) || this.createErrorElement(field);
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = document.getElementById(`error-${field.id}`);
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    createErrorElement(field) {
        const errorDiv = document.createElement('div');
        errorDiv.id = `error-${field.id}`;
        errorDiv.className = 'error-message';
        field.parentNode.appendChild(errorDiv);
        return errorDiv;
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    // ==================== GESTIÓN DE EMPRESA ====================

    async loadEmpresaData() {
        try {
            const response = await fetch('/api/empresa', {
                credentials: 'include'
            });
            
            if (response.ok) {
                this.empresaData = await response.json();
                this.populateEmpresaForm();
                console.log('🏢 Datos de empresa cargados:', this.empresaData);
            }
        } catch (error) {
            console.error('Error cargando datos empresa:', error);
        }
    }

    populateEmpresaForm() {
        if (this.empresaData) {
            document.getElementById('empresa-nombre').value = this.empresaData.nombre_empresa || '';
            document.getElementById('empresa-rif').value = this.empresaData.rif || '';
            document.getElementById('empresa-direccion').value = this.empresaData.direccion || '';
            document.getElementById('empresa-telefono').value = this.empresaData.telefono || '';
            document.getElementById('empresa-email').value = this.empresaData.email || '';
            document.getElementById('empresa-mensaje').value = this.empresaData.mensaje_factura || '';
        }
    }

    async handleEmpresaForm(e) {
        e.preventDefault();
        
        if (!this.validateForm(e.target)) {
            this.showAlert('Por favor, corrija los errores en el formulario', 'error');
            return;
        }
        
        const formData = {
            nombre_empresa: document.getElementById('empresa-nombre').value,
            rif: document.getElementById('empresa-rif').value,
            direccion: document.getElementById('empresa-direccion').value,
            telefono: document.getElementById('empresa-telefono').value,
            email: document.getElementById('empresa-email').value,
            mensaje_factura: document.getElementById('empresa-mensaje').value
        };

        try {
            const response = await fetch('/api/empresa', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showAlert('Información de empresa actualizada correctamente', 'success');
            } else {
                this.showAlert('Error al actualizar la información', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error de conexión', 'error');
        }
    }

    // ==================== GESTIÓN DE CATEGORÍAS ====================

  // ==================== GESTIÓN DE CATEGORÍAS MEJORADA ====================

// ==================== GESTIÓN DE CATEGORÍAS COMPLETA ====================

async loadCategorias() {
    try {
        const response = await fetch('/api/categorias', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const categorias = await response.json();
            this.categorias = categorias; 
            this.populateCategorias(categorias); 
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

populateCategorias(categorias) {
    const container = document.getElementById('categorias-list');
    if (!container) {
        console.error('❌ No se encontró el contenedor de categorías');
        return;
    }

    container.innerHTML = '';

    if (categorias.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-tags text-3xl mb-2"></i>
                <p>No hay categorías registradas</p>
                <p class="text-sm mt-2">Agrega tu primera categoría usando el formulario arriba</p>
            </div>
        `;
        return;
    }

    categorias.forEach(categoria => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors';
        item.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-gray-800">${categoria.nombre}</div>
                <div class="text-sm text-gray-500 mt-1">${categoria.descripcion || 'Sin descripción'}</div>
                <div class="text-xs text-gray-400 mt-1">
                    Estado: <span class="${categoria.estado === 'Activa' ? 'text-green-600' : 'text-red-600'} font-medium">${categoria.estado}</span>
                    • Creado: ${new Date(categoria.fecha_creacion).toLocaleDateString('es-ES')}
                </div>
            </div>
            <button class="btn-danger btn-sm" onclick="configManager.deleteCategoria(${categoria.id})" 
                    title="Eliminar categoría" ${categoria.estado === 'Inactiva' ? 'disabled' : ''}>
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

async addCategoria() {
    const nombreInput = document.getElementById('nueva-categoria');
    const descInput = document.getElementById('categoria-descripcion');
    const nombre = nombreInput.value.trim();
    
    if (!nombre) {
        this.showAlert('Ingrese un nombre para la categoría', 'error');
        return;
    }

    if (this.categorias) {
        const existeDuplicado = this.categorias.some(cat => 
            cat.nombre.toLowerCase() === nombre.toLowerCase()
        );
        
        if (existeDuplicado) {
            this.showAlert('❌ Ya existe una categoría con ese nombre', 'error');
            nombreInput.focus();
            return;
        }
    }

    try {
        const response = await fetch('/api/categorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                nombre: nombre,
                descripcion: descInput.value.trim() 
            })
        });

        if (response.ok) {
            nombreInput.value = '';
            descInput.value = '';
            this.loadCategorias(); // Recargar la lista
            this.showAlert('✅ Categoría agregada correctamente', 'success');
        } else {
            const errorData = await response.json();
            this.showAlert(errorData.error || 'Error al agregar la categoría', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        this.showAlert('Error de conexión', 'error');
    }
}

async deleteCategoria(id) {
    if (!confirm('¿Está seguro de eliminar esta categoría?')) return;

    try {
       // Verificar si hay productos usando esta categoría
        const productosResponse = await fetch(`/api/productos?categoria_id=${id}`, {
            credentials: 'include'
        });

        if (productosResponse.ok) {
            const productos = await productosResponse.json();
            if (productos.length > 0) {
                const nombresProductos = productos.map(p => `• ${p.nombre}`).join('\n');
                this.showAlert(
                    `❌ No se puede eliminar esta categoría\n\n` +
                    `Hay ${productos.length} producto(s) usando esta categoría:\n` +
                    `${nombresProductos}\n\n` +
                    `Reasigne los productos a otra categoría primero.`,
                    'error'
                );
                return;
            }
        }

        // Si no hay productos, proceder con la eliminación
        const response = await fetch(`/api/categorias/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            this.loadCategorias();
            this.showAlert('✅ Categoría eliminada correctamente', 'success');
        } else {
            const errorData = await response.json();
            this.showAlert(errorData.error || 'Error al eliminar la categoría', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        this.showAlert('Error de conexión', 'error');
    }
}




    // ==================== CONFIGURACIÓN DE NEGOCIO ====================

   async loadConfigNegocio() {
    try {
        const response = await fetch('/api/configuracion/negocio', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const config = await response.json();
            // Solo cargamos el IVA, el stock global ya no existe en el HTML
            const ivaInput = document.getElementById('iva-rate');
            if(ivaInput) ivaInput.value = config.iva_rate || 16;
            
            console.log('✅ Configuración negocio cargada:', config);
        }
    } catch (error) {
        console.error('Error cargando configuración negocio:', error);
    }
}

   async handleConfigNegocio() {
    // Solo capturamos el IVA
    const configData = {
        iva_rate: parseFloat(document.getElementById('iva-rate').value)
        // Eliminamos stock_minimo de aquí
    };

    if (isNaN(configData.iva_rate) || configData.iva_rate < 0 || configData.iva_rate > 100) {
        this.showAlert('La tasa de IVA debe estar entre 0 y 100', 'error');
        return;
    }

    // Eliminamos la validación del stock mínimo porque ya no existe

    try {
        const response = await fetch('/api/configuracion/negocio', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(configData)
        });

        if (response.ok) {
            const result = await response.json();
            this.showAlert('Configuración de negocio guardada correctamente', 'success');
            console.log('✅ Configuración guardada:', result);
        } else {
            this.showAlert('Error al guardar configuración', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        this.showAlert('Error de conexión', 'error');
    }
}

    // ==================== MÉTODOS DE PAGO ====================

async loadMetodosPago() {
    try {
        console.log('🔄 Cargando métodos de pago desde BD...');
        const response = await fetch('/api/configuracion/metodos-pago', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const metodos = await response.json();
            this.metodosPago = metodos;
            this.populateMetodosPago(metodos);
            
            // GUARDAR en localStorage para sincronización
            localStorage.setItem('metodosPagoConfig', JSON.stringify(metodos));
            localStorage.setItem('metodosPagoTimestamp', new Date().toISOString());
            
            console.log('✅ Métodos de pago cargados y guardados:', metodos);
        } else {
            throw new Error('Error en respuesta del servidor');
        }
    } catch (error) {
        console.error('❌ Error cargando métodos pago:', error);
        this.loadMetodosPagoFromFallback();
    }
}

loadMetodosPagoFromFallback() {
    console.log('🔄 Cargando métodos de pago desde fallback...');
    const metodosFallback = [
        { id: 'efectivo', nombre: 'Efectivo', habilitado: true },
        { id: 'tarjeta', nombre: 'Tarjeta', habilitado: true },
        { id: 'transferencia', nombre: 'Transferencia', habilitado: true },
        { id: 'pago_movil', nombre: 'Pago Móvil', habilitado: true }
    ];
    
    this.metodosPago = metodosFallback;
    this.populateMetodosPago(metodosFallback); // ✅ Esta función debe existir
}

populateMetodosPago(metodos) {
    console.log('🔧 Configurando métodos de pago en interfaz:', metodos);
    
    metodos.forEach(metodo => {
        const checkbox = document.getElementById(`pago-${metodo.id}`);
        if (checkbox) {
            checkbox.checked = metodo.habilitado;
            
            // Actualizar el texto del estado
            this.updateMetodoPagoUI(metodo.id, metodo.habilitado);
            
            // Remover event listeners existentes para evitar duplicados
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            
            // Agregar event listener para guardar cambios
            newCheckbox.addEventListener('change', () => {
                this.updateMetodoPago(metodo.id, newCheckbox.checked);
            });
        }
    });
}

async updateMetodoPago(metodo, habilitado) {
    try {
        console.log(`💾 Guardando método ${metodo} como ${habilitado ? 'habilitado' : 'deshabilitado'}...`);
        
        const response = await fetch(`/api/configuracion/metodos-pago/${metodo}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ habilitado })
        });

        if (response.ok) {
            const result = await response.json();
            
            // ACTUALIZAR configuración local
            this.metodosPago = this.metodosPago.map(m => 
                m.id === metodo ? {...m, habilitado} : m
            );
            
            // ACTUALIZAR localStorage para sincronización INMEDIATA
            localStorage.setItem('metodosPagoConfig', JSON.stringify(this.metodosPago));
            localStorage.setItem('metodosPagoTimestamp', new Date().toISOString());
            
            this.updateMetodoPagoUI(metodo, habilitado);
            this.showAlert(`✅ ${result.message}`, 'success');
            
            console.log(`✅ Método ${metodo} guardado en BD:`, habilitado);
            
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Error del servidor');
        }
    } catch (error) {
        console.error('❌ Error guardando método pago:', error);
        this.showAlert(`❌ ${error.message}`, 'error');
        
        // Revertir el cambio en la interfaz
        this.revertMetodoPagoUI(metodo, !habilitado);
    }
}

updateMetodoPagoUI(metodo, habilitado) {
    const checkbox = document.getElementById(`pago-${metodo}`);
    if (checkbox) {
        checkbox.checked = habilitado;
    }
    
    // Actualizar texto de estado
    const container = document.querySelector(`#pago-${metodo}`)?.closest('.flex.items-center.justify-between');
    if (container) {
        const statusElement = container.querySelector('.status-text') || this.createStatusElement(container);
        statusElement.textContent = habilitado ? 'Habilitado' : 'Deshabilitado';
        statusElement.className = `status-text text-sm font-medium ml-2 ${habilitado ? 'text-green-600' : 'text-red-600'}`;
    }
}

createStatusElement(container) {
    const statusElement = document.createElement('span');
    statusElement.className = 'status-text text-sm font-medium ml-2';
    container.querySelector('div').appendChild(statusElement);
    return statusElement;
}

revertMetodoPagoUI(metodo, estadoOriginal) {
    const checkbox = document.getElementById(`pago-${metodo}`);
    if (checkbox) {
        checkbox.checked = estadoOriginal;
    }
    
    const container = document.querySelector(`#pago-${metodo}`)?.closest('.flex.items-center.justify-between');
    if (container) {
        const statusElement = container.querySelector('.status-text');
        if (statusElement) {
            statusElement.textContent = estadoOriginal ? 'Habilitado' : 'Deshabilitado';
            statusElement.className = `status-text text-sm font-medium ml-2 ${estadoOriginal ? 'text-green-600' : 'text-red-600'}`;
        }
    }
}



    // ==================== GESTIÓN DE TASA DE CAMBIO ====================

    async loadTasaCambio() {
        try {
            console.log('🔄 Cargando tasa de cambio...');
            const response = await fetch('/api/tasa-cambio/actual', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const tasaData = await response.json();
                this.tasaCambioData = tasaData;
                this.populateTasaCambio(tasaData);
                console.log('✅ Tasa de cambio cargada:', tasaData);
            } else {
                throw new Error('Error cargando tasa de cambio');
            }
             this.actualizarEstadoTasaManual();
        } catch (error) {
            console.error('❌ Error cargando tasa de cambio:', error);
            this.showAlert('Error cargando tasa de cambio', 'error');
            this.actualizarEstadoTasaManual();
        }
    }

    populateTasaCambio(tasaData) {
        const tasaActualInput = document.getElementById('tasa-actual');
        const tasaFuenteDiv = document.getElementById('tasa-fuente');
        const tasaEstadoSpan = document.getElementById('tasa-estado');

        if (tasaActualInput && tasaData.tasa_bs) {
            tasaActualInput.value = parseFloat(tasaData.tasa_bs).toFixed(2);
        }

        if (tasaFuenteDiv) {
            let fuenteTexto = '';
            if (tasaData.fuente === 'api_oficial') {
                fuenteTexto = `🔄 Actualizado desde API Oficial - ${new Date(tasaData.fecha_actualizacion).toLocaleString()}`;
            } else if (tasaData.fuente === 'fallback') {
                fuenteTexto = `⚠️ Usando tasa de respaldo - ${new Date(tasaData.fecha_actualizacion).toLocaleString()}`;
            } else {
                fuenteTexto = `💾 Tasa guardada - ${new Date(tasaData.fecha_actualizacion).toLocaleString()}`;
            }
            tasaFuenteDiv.textContent = fuenteTexto;
        }

        this.loadTasaHistorial();
    }

    async loadTasaHistorial() {
        try {
            const response = await fetch('/api/tasa-cambio/historial', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const historial = await response.json();
                this.populateTasaHistorial(historial);
            }
        } catch (error) {
            console.error('Error cargando historial de tasas:', error);
            this.showTasaHistorialError();
        }
    }

    populateTasaHistorial(historial) {
        const container = document.getElementById('tasa-historial');
        if (!container) return;

        if (historial.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-exchange-alt text-3xl mb-2"></i>
                    <p>No hay historial de tasas</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        historial.forEach(tasa => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
            
            const fecha = new Date(tasa.fecha_actualizacion);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="flex-1">
                    <div class="font-medium text-lg">${parseFloat(tasa.tasa_bs).toFixed(2)} BS/USD</div>
                    <div class="text-sm text-gray-500">
                        ${fechaFormateada} • 
                        <span class="font-medium ${tasa.fuente === 'api' ? 'text-green-600' : 'text-blue-600'}">
                            ${tasa.fuente === 'api' ? 'API Oficial' : 'Manual'}
                        </span>
                        ${tasa.activo ? ' • ✅ Activa' : ' • ❌ Inactiva'}
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-gray-400">
                        ${tasa.id ? `ID: ${tasa.id}` : ''}
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    async actualizarTasaDesdeAPI() {
        const button = document.getElementById('actualizar-tasa-api');
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Actualizando...';

            console.log('🔄 Actualizando tasa desde API...');
            const response = await fetch('/api/tasa-cambio/actual', {
                credentials: 'include'
            });

            if (response.ok) {
                const nuevaTasa = await response.json();
                this.tasaCambioData = nuevaTasa;
                this.populateTasaCambio(nuevaTasa);
                this.showAlert('✅ Tasa de cambio actualizada correctamente', 'success');
                console.log('✅ Tasa actualizada:', nuevaTasa);
            } else {
                throw new Error('Error en la respuesta de la API');
            }
        } catch (error) {
            console.error('❌ Error actualizando tasa:', error);
            this.showAlert('❌ Error actualizando tasa de cambio', 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    async guardarTasaManual() {
    const tasaManualInput = document.getElementById('tasa-manual');
    const tasaValor = parseFloat(tasaManualInput.value);

    if (!tasaValor || tasaValor <= 0) {
        this.showAlert('❌ Ingrese una tasa válida mayor a 0', 'error');
        return;
    }

    try {
        console.log('💾 Guardando tasa manual:', tasaValor);
        
        // ✅ PASO 1: Guardar en la base de datos
        const response = await fetch('/api/tasa-cambio/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                tasa_bs: tasaValor,
                fuente: 'manual' 
            })
        });

        if (response.ok) {
            // ✅ PASO 2: Guardar en localStorage para uso INMEDIATO
            localStorage.setItem('tasaCambioManual', tasaValor.toString());
            localStorage.setItem('tasaCambioTimestamp', new Date().toISOString());
            
            // ✅ PASO 3: Limpiar y mostrar confirmación
            tasaManualInput.value = '';
            this.loadTasaCambio(); // Recargar datos
            this.actualizarEstadoTasaManual(); // ← AGREGAR ESTA LÍNEA
            this.showAlert('✅ Tasa manual guardada y ACTIVADA para ventas', 'success');
            
            console.log('💾 Tasa manual activada:', tasaValor);
        } else {
            const error = await response.json();
            this.showAlert(error.error || 'Error guardando tasa manual', 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando tasa manual:', error);
        this.showAlert('Error de conexión al guardar tasa', 'error');
    }
}

    async forzarActualizacionTasa() {
        try {
            const response = await fetch('/api/tasa-cambio/forzar-actualizacion', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.loadTasaCambio();
                this.showAlert('🔄 Actualización forzada completada', 'success');
            } else {
                throw new Error('Error forzando actualización');
            }
        } catch (error) {
            console.error('❌ Error forzando actualización:', error);
            this.showAlert('Error forzando actualización', 'error');
        }
    }

    

    async toggleTasaActiva(activa) {
        try {
            const response = await fetch('/api/tasa-cambio/estado', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ activo: activa })
            });

            if (response.ok) {
                const estado = activa ? 'activada' : 'desactivada';
                this.showAlert(`✅ Tasa ${estado} correctamente`, 'success');
                
                const tasaEstadoSpan = document.getElementById('tasa-estado');
                if (tasaEstadoSpan) {
                    tasaEstadoSpan.textContent = activa ? 'Activa' : 'Inactiva';
                }
            } else {
                const checkbox = document.getElementById('tasa-activa');
                if (checkbox) {
                    checkbox.checked = !activa;
                }
                this.showAlert('❌ Error cambiando estado de la tasa', 'error');
            }
        } catch (error) {
            console.error('❌ Error cambiando estado tasa:', error);
            
            const checkbox = document.getElementById('tasa-activa');
            if (checkbox) {
                checkbox.checked = !activa;
            }
            this.showAlert('Error de conexión', 'error');
        }
    }

    showTasaHistorialError() {
        const container = document.getElementById('tasa-historial');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Error cargando historial de tasas</p>
                </div>
            `;
        }
    }

    // ==================== BACKUP Y SEGURIDAD ====================

    async loadBackupHistory() {
        try {
            const response = await fetch('/api/backup/history', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const backups = await response.json();
                this.populateBackupHistory(backups);
            }
        } catch (error) {
            console.error('Error cargando historial backup:', error);
            this.showBackupError();
        }
    }

    populateBackupHistory(backups) {
        const container = document.getElementById('backup-history');
        if (!container) return;

        if (backups.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-database text-3xl mb-2"></i>
                    <p>No hay copias de seguridad</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        backups.forEach(backup => {
            const item = document.createElement('div');
            item.className = 'backup-item flex items-center justify-between p-4 bg-gray-50 rounded-lg';
            item.innerHTML = `
                <div class="flex-1">
                    <div class="font-medium">${backup.filename}</div>
                    <div class="text-sm text-gray-500">
                        ${new Date(backup.created_at).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} - ${backup.size}
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button class="btn-info btn-sm" onclick="configManager.downloadBackup('${backup.filename}')" title="Descargar backup">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-danger btn-sm" onclick="configManager.deleteBackup('${backup.filename}')" title="Eliminar backup">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    async createBackup() {
        const button = document.getElementById('create-backup');
        const progress = document.getElementById('backup-progress');
        const progressFill = progress.querySelector('.progress-fill');
        const status = document.getElementById('backup-status');

        button.disabled = true;
        progress.classList.remove('hidden');
        status.textContent = 'Creando copia de seguridad...';

        try {
            let width = 0;
            const progressInterval = setInterval(() => {
                width += 5;
                progressFill.style.width = width + '%';
                
                if (width >= 90) {
                    clearInterval(progressInterval);
                }
            }, 200);

            const response = await fetch('/api/backup/create', {
                method: 'POST',
                credentials: 'include'
            });

            clearInterval(progressInterval);
            progressFill.style.width = '100%';

            if (response.ok) {
                const result = await response.json();
                status.textContent = '✅ Backup creado exitosamente';
                this.showAlert('Copia de seguridad creada correctamente', 'success');
                this.loadBackupHistory();
                
                setTimeout(() => {
                    progress.classList.add('hidden');
                    button.disabled = false;
                    progressFill.style.width = '0%';
                }, 2000);
            } else {
                const error = await response.json();
                status.textContent = '❌ Error creando backup';
                this.showAlert(error.error || 'Error creando backup', 'error');
                button.disabled = false;
            }
        } catch (error) {
            console.error('Error creando backup:', error);
            status.textContent = '❌ Error de conexión';
            this.showAlert('Error de conexión al crear backup', 'error');
            button.disabled = false;
        }
    }

    async downloadBackup(filename) {
        try {
            const response = await fetch(`/api/backup/download/${filename}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showAlert('Descargando backup...', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Error descargando backup', 'error');
            }
        } catch (error) {
            console.error('Error descargando backup:', error);
            this.showAlert('Error de conexión al descargar', 'error');
        }
    }

    async deleteBackup(filename) {
        if (!confirm(`¿Está seguro de eliminar el backup "${filename}"?`)) return;

        try {
            const response = await fetch(`/api/backup/${filename}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.loadBackupHistory();
                this.showAlert('Backup eliminado correctamente', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Error eliminando backup', 'error');
            }
        } catch (error) {
            console.error('Error eliminando backup:', error);
            this.showAlert('Error de conexión al eliminar', 'error');
        }
    }

    showBackupError() {
        const container = document.getElementById('backup-history');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Error cargando backups</p>
                </div>
            `;
        }
    }

    // ==================== NAVEGACIÓN Y UTILIDADES ====================

    switchSection(section) {
        document.querySelectorAll('.config-section').forEach(sec => {
            sec.classList.add('hidden');
        });
        
        const targetSection = document.getElementById(`section-${section}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            
            if (section === 'tasa-cambio') {
                this.loadTasaCambio();
            }
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${section}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        this.currentSection = section;
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm fade-in`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        alert.className += ` ${colors[type] || colors.info}`;
        alert.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    desactivarTasaManual() {
    localStorage.removeItem('tasaCambioManual');
    localStorage.removeItem('tasaCambioTimestamp');
    this.showAlert('✅ Tasa manual desactivada. Se usará tasa automática.', 'success');
    this.loadTasaCambio(); // Recargar
}

// Función para desactivar tasa manual
desactivarTasaManual() {
    localStorage.removeItem('tasaCambioManual');
    localStorage.removeItem('tasaCambioTimestamp');
    this.showAlert('✅ Tasa manual desactivada. Se usará tasa automática.', 'success');
    this.actualizarEstadoTasaManual(); // Actualizar interfaz
    this.loadTasaCambio(); // Recargar datos
}

// Función para actualizar el estado visual
actualizarEstadoTasaManual() {
    const tasaManual = localStorage.getItem('tasaCambioManual');
    const statusElement = document.getElementById('tasa-status-text');
    const desactivarBtn = document.getElementById('desactivar-tasa-manual');
    const statusAlert = document.getElementById('tasa-manual-status');

    if (tasaManual) {
        const timestamp = localStorage.getItem('tasaCambioTimestamp');
        const horasRestantes = 24 - ((new Date() - new Date(timestamp)) / (1000 * 60 * 60));
        
        if (statusElement) {
            statusElement.innerHTML = `
                <strong>Tasa Manual Activada:</strong> ${tasaManual} BS/USD 
                <br><small>Expira en: ${Math.max(0, Math.floor(horasRestantes))} horas</small>
            `;
        }
        if (desactivarBtn) desactivarBtn.classList.remove('hidden');
        if (statusAlert) statusAlert.className = 'alert alert-success mb-4';
    } else {
        if (statusElement) {
            statusElement.textContent = 'Usando tasa automática desde API';
        }
        if (desactivarBtn) desactivarBtn.classList.add('hidden');
        if (statusAlert) statusAlert.className = 'alert alert-info mb-4';
    }
}


}

// Inicializar
let configManager;
document.addEventListener('DOMContentLoaded', () => {
    configManager = new ConfiguracionManager();
});