class ProveedoresManager {
    constructor() {
        this.API_BASE = '/api';
        this.proveedores = [];
        this.init();
    }

    async init() {
        console.log('🚚 Inicializando Gestor de Proveedores (Módulo Compras)...');
        this.setupEventListeners();
        // Carga paralela de datos y estadísticas
        await Promise.all([
            this.cargarProveedores(),
            this.cargarEstadisticas()
        ]);
    }

    setupEventListeners() {
        // Botón Nuevo (Scroll suave al formulario)
        document.querySelector('.btn-nuevo')?.addEventListener('click', () => {
            this.resetForm();
            document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
            document.getElementById('nombre').focus();
        });

        // Buscador en tiempo real
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filtrarTabla(e.target.value);
        });

        // Enviar Formulario (Crear/Editar)
        document.getElementById('proveedor-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarProveedor();
        });

        // Cancelar Edición
        document.getElementById('btn-cancelar')?.addEventListener('click', () => {
            this.resetForm();
        });
    }

    // --- CARGA DE DATOS ---

    async cargarProveedores() {
        const tbody = document.getElementById('proveedores-body');
        try {
            const response = await fetch(`${this.API_BASE}/proveedores`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (!response.ok) throw new Error('Error al cargar proveedores');

            const data = await response.json();
            this.proveedores = data.proveedores || []; 
            
            this.renderizarTabla(this.proveedores);

        } catch (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--danger);">Error de conexión con el servidor</td></tr>';
            this.mostrarNotificacion('Error cargando lista de proveedores', 'error');
        }
    }

    async cargarEstadisticas() {
        try {
            const response = await fetch(`${this.API_BASE}/proveedores/stats/estadisticas`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const stats = data.estadisticas;
                
                // Actualizar las tarjetas de colores
                // Card Morada (Total)
                const totalEl = document.getElementById('card-total');
                if(totalEl) totalEl.textContent = stats.total_proveedores || 0;

                // Card Verde (Con Productos)
                const activosEl = document.getElementById('card-con-productos');
                if(activosEl) activosEl.textContent = stats.proveedores_con_productos || 0;

                // Card Azul (Total Productos)
                const prodEl = document.getElementById('card-total-productos');
                if(prodEl) prodEl.textContent = stats.total_productos_asociados || 0;
            }
        } catch (error) {
            console.warn('No se pudieron cargar estadísticas', error);
        }
    }

    // --- RENDERIZADO ---

    renderizarTabla(datos) {
        const tbody = document.getElementById('proveedores-body');
        tbody.innerHTML = '';

        if (datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No se encontraron proveedores registrados.</td></tr>';
            document.getElementById('registros-info').textContent = 'Mostrando 0 registros';
            return;
        }

        datos.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="id-badge">#${p.id}</span></td>
                <td>
                    <div class="supplier-info">
                        <i class="fa-solid fa-building"></i>
                        <strong>${this.escapeHtml(p.nombre)}</strong>
                    </div>
                </td>
                <td>${this.escapeHtml(p.contacto || '-')}</td>
                <td><small>${this.escapeHtml(p.direccion || 'Sin dirección')}</small></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="proveedoresManager.verProductos(${p.id}, '${this.escapeHtml(p.nombre)}')" title="Ver Productos">
                            <i class="fa-solid fa-box"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="proveedoresManager.editarProveedor(${p.id})" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="proveedoresManager.eliminarProveedor(${p.id})" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('registros-info').textContent = `Mostrando ${datos.length} registros`;
    }

    filtrarTabla(termino) {
        const term = termino.toLowerCase();
        const filtrados = this.proveedores.filter(p => 
            p.nombre.toLowerCase().includes(term) || 
            (p.contacto && p.contacto.toLowerCase().includes(term))
        );
        this.renderizarTabla(filtrados);
    }

    // --- OPERACIONES CRUD ---

    async guardarProveedor() {
        const btn = document.querySelector('#proveedor-form button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        const id = document.getElementById('proveedor-id').value;
        const datos = {
            nombre: document.getElementById('nombre').value.trim(),
            contacto: document.getElementById('contacto').value.trim(),
            direccion: document.getElementById('direccion').value.trim()
        };

        try {
            const url = id ? `${this.API_BASE}/proveedores/${id}` : `${this.API_BASE}/proveedores`;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(datos)
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Error al guardar');

            this.mostrarNotificacion(id ? 'Proveedor actualizado' : 'Proveedor registrado', 'success');
            this.resetForm();
            this.cargarProveedores();
            this.cargarEstadisticas(); // Actualizar tarjetas

        } catch (error) {
            this.mostrarNotificacion(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    editarProveedor(id) {
        const p = this.proveedores.find(item => item.id === id);
        if (!p) return;

        document.getElementById('proveedor-id').value = p.id;
        document.getElementById('nombre').value = p.nombre;
        document.getElementById('contacto').value = p.contacto || '';
        document.getElementById('direccion').value = p.direccion || '';

        // Cambiar estado visual del formulario
        const headerTitle = document.querySelector('.form-header h3');
        if(headerTitle) headerTitle.innerHTML = `<i class="fa-solid fa-pen"></i> Editando: ${p.nombre}`;
        
        document.getElementById('btn-cancelar').style.display = 'inline-flex';
        document.querySelector('#proveedor-form button[type="submit"]').innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar';
        
        document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('nombre').focus();
    }

    async eliminarProveedor(id) {
        if (!confirm('¿Estás seguro de eliminar este proveedor?\nEsta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`${this.API_BASE}/proveedores/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error(`No se puede eliminar: ${result.error}`);
                }
                throw new Error(result.error || 'Error al eliminar');
            }

            this.mostrarNotificacion('Proveedor eliminado correctamente', 'success');
            this.cargarProveedores();
            this.cargarEstadisticas();

        } catch (error) {
            this.mostrarNotificacion(error.message, 'error');
        }
    }

    // Reemplaza tu función verProductos actual con esta:
    async verProductos(id, nombreProveedor) {
        try {
            const btn = document.querySelector(`button[onclick*="verProductos(${id}"]`);
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Feedback de carga

            const response = await fetch(`${this.API_BASE}/proveedores/${id}/productos`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();

            btn.innerHTML = originalIcon; // Restaurar icono

            // Llenar datos del modal
            document.getElementById('modal-provider-name').textContent = nombreProveedor;
            const tbody = document.getElementById('modal-products-body');
            tbody.innerHTML = '';

            if (data.productos && data.productos.length > 0) {
                data.productos.forEach(p => {
                    // Determinar color del badge de stock
                    let badgeClass = 'success';
                    if(parseFloat(p.stock) <= 0) badgeClass = 'danger';
                    else if(parseFloat(p.stock) < 10) badgeClass = 'warning';

                    const row = `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <i class="fa-solid fa-box" style="color:var(--primary);"></i>
                                    <strong>${this.escapeHtml(p.nombre)}</strong>
                                </div>
                            </td>
                            <td>${this.escapeHtml(p.categoria_nombre || 'General')}</td>
                            <td>
                                <span class="badge badge-${badgeClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">
                                    ${parseFloat(p.stock).toFixed(2)} ${p.unidad_medida || 'u'}
                                </span>
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align:center; padding: 30px; color: #999;">
                            <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display:block;"></i>
                            Este proveedor no tiene productos asignados actualmente.
                        </td>
                    </tr>
                `;
            }

            // Mostrar Modal
            document.getElementById('modal-productos').classList.add('active');

        } catch (error) {
            console.error(error);
            this.mostrarNotificacion('Error al obtener productos', 'error');
        }
    }

    // Agrega esta nueva función:
    cerrarModal() {
        document.getElementById('modal-productos').classList.remove('active');
    }
    // --- UTILIDADES ---

    resetForm() {
        document.getElementById('proveedor-form').reset();
        document.getElementById('proveedor-id').value = '';
        
        const headerTitle = document.querySelector('.form-header h3');
        if(headerTitle) headerTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Registrar / Editar Proveedor';
        
        document.getElementById('btn-cancelar').style.display = 'none';
        document.querySelector('#proveedor-form button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Guardar Proveedor';
    }

    mostrarNotificacion(mensaje, tipo) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `<i class="fa-solid ${tipo === 'success' ? 'fa-check' : tipo === 'error' ? 'fa-triangle-exclamation' : 'fa-info'}-circle"></i> ${mensaje}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}

// Inicializar
window.proveedoresManager = new ProveedoresManager();