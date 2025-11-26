class CategoriasManager {
    constructor() {
        this.API_BASE = '/api';
        this.categorias = [];
        this.editMode = false;
        this.currentId = null;
        this.init();
    }

    async init() {
        console.log('Inicializando Categorías...');
        this.setupEventListeners();
        await this.cargarCategorias();
    }

    setupEventListeners() {
        // Botón Nuevo
        document.querySelector('.btn-nuevo')?.addEventListener('click', () => {
            this.resetForm();
            document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
            document.getElementById('categoria-nombre').focus();
        });

        // Buscador
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filterTable(e.target.value);
        });

        // Submit
        document.getElementById('categoria-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategoria();
        });

        // Cancelar
        document.getElementById('btn-cancelar')?.addEventListener('click', () => {
            this.resetForm();
        });
    }

    async cargarCategorias() {
        const tbody = document.getElementById('categorias-body');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando datos...</div></td></tr>';
        
        try {
            const response = await fetch(`${this.API_BASE}/categorias`, { credentials: 'include' });
            if (!response.ok) throw new Error('Error al cargar datos');

            this.categorias = await response.json();
            this.renderTable(this.categorias);
            this.updateStats();

        } catch (error) {
            console.error(error);
            this.mostrarNotificacion('Error al cargar las categorías', 'error');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">Error de conexión</td></tr>';
        }
    }

    renderTable(data) {
        const tbody = document.getElementById('categorias-body');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No se encontraron categorías</td></tr>';
            document.getElementById('registros-info').textContent = 'Mostrando 0 registros';
            return;
        }

        data.forEach(cat => {
            const tr = document.createElement('tr');
            
            // Estilo visual para inactivas
            if (cat.estado === 'Inactiva') {
                tr.style.backgroundColor = '#f9f9f9';
                tr.style.color = '#999';
            }

            const fecha = new Date(cat.fecha_creacion).toLocaleDateString('es-ES');
            
            const estadoBadge = cat.estado === 'Activa' 
                ? '<span class="badge badge-success">Activa</span>' 
                : '<span class="badge badge-danger">Inactiva</span>';

            const prodCount = parseInt(cat.total_productos || 0);
            const prodBadge = prodCount > 0 
                ? `<span class="badge badge-info" style="background: #e3f2fd; color: #0d47a1;">${prodCount} productos</span>`
                : `<span class="badge badge-secondary" style="background: #f5f5f5; color: #999;">Sin productos</span>`;

            // Lógica de botones: Si está inactiva, no mostramos el botón de borrar/desactivar
            const deleteButton = cat.estado === 'Activa' 
                ? `<button class="btn btn-sm btn-danger" onclick="categoriasManager.deleteCategoria(${cat.id}, ${prodCount})" title="Desactivar">
                     <i class="fa-solid fa-ban"></i>
                   </button>`
                : ''; 

            // Botón reactivar (opcional, reutilizamos editar para cambiar estado)
            const editButton = `<button class="btn btn-sm btn-info" onclick="categoriasManager.prepararEdicion(${cat.id})" title="Editar / Activar">
                                    <i class="fa-solid fa-pen"></i>
                                </button>`;

            tr.innerHTML = `
                <td><strong>${cat.id}</strong></td>
                <td>${this.escapeHtml(cat.nombre)}</td>
                <td>${this.escapeHtml(cat.descripcion || '-')}</td>
                <td>${prodBadge}</td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="action-buttons">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('registros-info').textContent = `Mostrando ${data.length} registros`;
    }

    // Resto de funciones (Filter, UpdateStats) se mantienen igual...
    filterTable(term) {
        const search = term.toLowerCase();
        const filtered = this.categorias.filter(cat => 
            cat.nombre.toLowerCase().includes(search) || 
            (cat.descripcion && cat.descripcion.toLowerCase().includes(search))
        );
        this.renderTable(filtered);
    }

    updateStats() {
        const totalEl = document.getElementById('card-total-categorias');
        const activasEl = document.getElementById('card-activas');
        if (totalEl) totalEl.textContent = this.categorias.length;
        if (activasEl) activasEl.textContent = this.categorias.filter(c => c.estado === 'Activa').length;
    }

    async saveCategoria() {
        const nombre = document.getElementById('categoria-nombre').value.trim();
        const descripcion = document.getElementById('categoria-descripcion').value.trim();
        const id = document.getElementById('categoria-id').value;
        
        if (!nombre) {
            this.mostrarNotificacion('El nombre es obligatorio', 'error');
            return;
        }

        // Si estamos creando una nueva, validamos duplicados
        if (!id && this.categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
            this.mostrarNotificacion('Ya existe una categoría con este nombre', 'error');
            return;
        }

        const btn = document.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;

        try {
            const url = id ? `${this.API_BASE}/categorias/${id}` : `${this.API_BASE}/categorias`;
            const method = id ? 'PUT' : 'POST';
            
            const bodyData = { nombre, descripcion };
            
            // Si editamos, buscamos el estado original o permitimos reactivar si estaba inactiva
            if (id) {
                const catActual = this.categorias.find(c => c.id == id);
                // Si se edita, asumimos que queremos que esté activa o mantenemos estado
                bodyData.estado = catActual ? catActual.estado : 'Activa';
                
                // OPCIONAL: Si editas una inactiva, ¿la reactivas automáticamente? 
                // Por ahora dejemos que mantenga su estado o use un botón específico.
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                this.mostrarNotificacion(id ? 'Categoría actualizada' : 'Categoría creada', 'success');
                this.resetForm();
                this.cargarCategorias();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error al guardar');
            }
        } catch (error) {
            this.mostrarNotificacion(error.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async deleteCategoria(id, count) {
        // ✅ MEJORA: Mensaje personalizado según si tiene productos
        let mensaje = '¿Deseas desactivar esta categoría?';
        if (count > 0) {
            mensaje = `⚠️ Esta categoría tiene ${count} productos asociados.\n\nAl desactivarla, los productos seguirán existiendo pero la categoría figurará como Inactiva.\n\n¿Deseas continuar?`;
        }

        if (!confirm(mensaje)) return;

        try {
            // Llamamos al DELETE que ahora hace UPDATE estado='Inactiva' en el backend
            const response = await fetch(`${this.API_BASE}/categorias/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.mostrarNotificacion('Categoría desactivada', 'success');
                this.cargarCategorias();
            } else {
                const err = await response.json();
                throw new Error(err.error);
            }
        } catch (error) {
            this.mostrarNotificacion(error.message || 'Error al desactivar', 'error');
        }
    }

    prepararEdicion(id) {
        const cat = this.categorias.find(c => c.id === id);
        if (!cat) return;

        this.editMode = true;
        this.currentId = id;

        document.getElementById('categoria-id').value = cat.id;
        document.getElementById('categoria-nombre').value = cat.nombre;
        document.getElementById('categoria-descripcion').value = cat.descripcion || '';

        // Cambiar interfaz
        document.querySelector('.form-section h2').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Categoría';
        const btnSubmit = document.querySelector('#categoria-form button[type="submit"]');
        btnSubmit.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar';
        
        const btnCancelar = document.getElementById('btn-cancelar');
        if(btnCancelar) btnCancelar.style.display = 'inline-block';

        // Si está inactiva, podemos ofrecer activarla al guardar
        if(cat.estado === 'Inactiva') {
             this.mostrarNotificacion('Estás editando una categoría inactiva. Puedes cambiar su estado manualmente si lo requieres (backend feature).', 'info');
        }

        document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('categoria-nombre').focus();
    }

    resetForm() {
        document.getElementById('categoria-form').reset();
        document.getElementById('categoria-id').value = '';
        document.querySelector('.form-section h2').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Registrar / Editar Categoría';
        document.querySelector('#categoria-form button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Guardar';
        
        const btnCancelar = document.getElementById('btn-cancelar');
        if(btnCancelar) btnCancelar.style.display = 'none';
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    mostrarNotificacion(mensaje, tipo) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `<i class="fa-solid ${tipo === 'success' ? 'fa-check' : 'fa-info'}-circle"></i> ${mensaje}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Inicializar
let categoriasManager;
document.addEventListener('DOMContentLoaded', () => {
    categoriasManager = new CategoriasManager();
    window.categoriasManager = categoriasManager;
});