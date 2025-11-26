// Clientes.js - Módulo de Gestión de Clientes
class ClientesManager {
    constructor() {
        this.clientes = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.totalRecords = 0;
        this.currentFilter = '';
        this.currentStatusFilter = '';
        this.currentEditingId = null;
        this.masterPassword = 'admin123'; // Clave maestra por defecto
        this.currentUser = null;

        this.initializeEventListeners();
        this.checkSession();
    }

    async checkSession() {
        try {
            const response = await fetch('/api/sesion', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Error verificando sesión');
            }

            const data = await response.json();
            
            if (data.autenticado && data.usuario) {
                this.currentUser = data.usuario;
                this.updateUIForUserRole();
                this.loadClientes();
                this.loadStats();
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
            this.redirectToLogin();
        }
    }

    updateUIForUserRole() {
        if (!this.currentUser) return;

        const userRoleElement = document.getElementById('user-role');
        if (userRoleElement) {
            userRoleElement.textContent = this.currentUser.rol.toUpperCase();
            userRoleElement.className = `role-badge role-${this.currentUser.rol.toLowerCase().replace(' ', '-')}`;
        }
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const config = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.redirectToLogin();
                throw new Error('Sesión expirada');
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
                throw new Error(errorData.error || `Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.message !== 'Sesión expirada') {
                console.error('Error en petición:', error);
                this.showError(error.message || 'Error de conexión con el servidor');
            }
            throw error;
        }
    }

    initializeEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilter = e.target.value;
                this.currentPage = 1;
                this.loadClientes();
            });
        }

        // Filtro por estado
        const filterStatus = document.getElementById('filter-status');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                this.currentStatusFilter = e.target.value;
                this.currentPage = 1;
                this.loadClientes();
            });
        }

        // Botones de acción
        const btnAddClient = document.getElementById('btn-add-client');
        if (btnAddClient) {
            btnAddClient.addEventListener('click', () => this.showAddModal());
        }

        const btnExportPdf = document.getElementById('btn-export-pdf');
        if (btnExportPdf) {
            btnExportPdf.addEventListener('click', () => this.exportToPDF());
        }

        // Modal de cliente
        const closeModal = document.getElementById('close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideModal());
        }

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        const clientForm = document.getElementById('client-form');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => this.saveCliente(e));
        }

        // Modal de clave maestra
        const cancelMasterPassword = document.getElementById('cancel-master-password');
        if (cancelMasterPassword) {
            cancelMasterPassword.addEventListener('click', () => this.hideMasterPasswordModal());
        }

        const masterPasswordForm = document.getElementById('master-password-form');
        if (masterPasswordForm) {
            masterPasswordForm.addEventListener('submit', (e) => this.verifyMasterPassword(e));
        }

        // Modal de confirmación de eliminación
        const cancelDelete = document.getElementById('cancel-delete');
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.hideDeleteModal());
        }

        const confirmDelete = document.getElementById('confirm-delete');
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.deleteCliente());
        }

        // Paginación
        const prevPage = document.getElementById('prev-page');
        if (prevPage) {
            prevPage.addEventListener('click', () => this.previousPage());
        }

        const nextPage = document.getElementById('next-page');
        if (nextPage) {
            nextPage.addEventListener('click', () => this.nextPage());
        }

        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    async loadClientes() {
        try {
            let url = `/api/clientes?page=${this.currentPage}&limit=${this.itemsPerPage}`;
            
            if (this.currentFilter) {
                if (this.currentFilter.match(/[VJEG]-/i)) {
                    url += `&cedula=${encodeURIComponent(this.currentFilter)}`;
                } else {
                    url += `&nombre=${encodeURIComponent(this.currentFilter)}`;
                }
            }

            if (this.currentStatusFilter === 'active') {
                url += `&estado=Activo`;
            } else if (this.currentStatusFilter === 'inactive') {
                url += `&estado=Inactivo`;
            }

            const data = await this.makeAuthenticatedRequest(url);
            
            this.clientes = data.clientes || data;
            this.totalPages = data.pagination ? data.pagination.pages : 1;
            this.totalRecords = data.pagination ? data.pagination.total : data.length;
            
            this.renderTable();
            this.updatePagination();

        } catch (error) {
            console.error('Error:', error);
            if (error.message !== 'Sesión expirada') {
                this.showError('Error al cargar los clientes');
            }
        }
    }

    async loadStats() {
        try {
            const data = await this.makeAuthenticatedRequest('/api/clientes-stats');
            
            document.getElementById('total-clientes').textContent = data.total || 0;
            document.getElementById('clientes-activos').textContent = data.activos || 0;
            document.getElementById('clientes-inactivos').textContent = data.inactivos || 0;
            document.getElementById('nuevos-mes').textContent = data.nuevosMes || 0;

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Si falla, calcular estadísticas desde los datos locales
            this.calculateLocalStats();
        }
    }

    calculateLocalStats() {
        const total = this.clientes.length;
        const activos = this.clientes.filter(c => c.estado === 'Activo').length;
        const inactivos = this.clientes.filter(c => c.estado === 'Inactivo').length;
        
        document.getElementById('total-clientes').textContent = total;
        document.getElementById('clientes-activos').textContent = activos;
        document.getElementById('clientes-inactivos').textContent = inactivos;
        document.getElementById('nuevos-mes').textContent = total; // Placeholder
    }

    renderTable() {
        const tbody = document.getElementById('clients-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.clientes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">
                        <i class="fas fa-users text-4xl mb-2 block"></i>
                        No se encontraron clientes
                    </td>
                </tr>
            `;
            return;
        }

        this.clientes.forEach(cliente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="font-mono text-sm">${cliente.cedula_rif}</div>
                </td>
                <td>
                    <div class="font-semibold text-gray-800">${cliente.nombre}</div>
                </td>
                <td>
                    <div class="text-gray-600">${cliente.telefono || '-'}</div>
                </td>
                <td>
                    <div class="text-gray-600 max-w-xs truncate" title="${cliente.direccion || ''}">
                        ${cliente.direccion || '-'}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${cliente.estado === 'Activo' ? 'status-active' : 'status-inactive'}">
                        ${cliente.estado}
                    </span>
                </td>
                <td>
                    <div class="text-sm text-gray-500">
                        ${this.formatDate(cliente.fecha_registro)}
                    </div>
                </td>
                <td>
                    <div class="flex justify-center space-x-2">
                        <button class="btn-icon btn-edit" onclick="clientesManager.editCliente(${cliente.id})" 
                                title="Editar cliente">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="clientesManager.confirmDelete(${cliente.id})" 
                                title="Eliminar cliente">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updatePagination() {
        const from = ((this.currentPage - 1) * this.itemsPerPage) + 1;
        const to = Math.min(this.currentPage * this.itemsPerPage, this.totalRecords);

        const showingFrom = document.getElementById('showing-from');
        const showingTo = document.getElementById('showing-to');
        const totalRecords = document.getElementById('total-records');

        if (showingFrom) showingFrom.textContent = from;
        if (showingTo) showingTo.textContent = to;
        if (totalRecords) totalRecords.textContent = this.totalRecords;

        // Botones de paginación
        const prevPage = document.getElementById('prev-page');
        const nextPage = document.getElementById('next-page');
        
        if (prevPage) {
            prevPage.disabled = this.currentPage === 1;
            prevPage.classList.toggle('opacity-50', this.currentPage === 1);
        }
        if (nextPage) {
            nextPage.disabled = this.currentPage === this.totalPages;
            nextPage.classList.toggle('opacity-50', this.currentPage === this.totalPages);
        }

        // Números de página
        const pageNumbers = document.getElementById('page-numbers');
        if (pageNumbers) {
            pageNumbers.innerHTML = '';

            for (let i = 1; i <= this.totalPages; i++) {
                const button = document.createElement('button');
                button.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
                button.textContent = i;
                button.addEventListener('click', () => this.goToPage(i));
                pageNumbers.appendChild(button);
            }
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadClientes();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadClientes();
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadClientes();
    }

    showAddModal() {
        this.currentEditingId = null;
        const modalTitle = document.getElementById('modal-title');
        const fechaRegistroGroup = document.getElementById('fecha-registro-group');
        const estadoGroup = document.getElementById('estado-group');
        const clientForm = document.getElementById('client-form');

        if (modalTitle) {
            modalTitle.innerHTML = `
                <i class="fas fa-user-plus mr-3 text-purple-600"></i>
                Agregar Nuevo Cliente
            `;
        }

        if (clientForm) clientForm.reset();
        if (fechaRegistroGroup) fechaRegistroGroup.classList.add('hidden');
        if (estadoGroup) estadoGroup.classList.add('hidden');
        
        // Ocultar campo de email en el formulario
        const emailGroup = document.querySelector('.form-group label[for="email"]')?.closest('.form-group');
        if (emailGroup) emailGroup.style.display = 'none';
        
        const modal = document.getElementById('client-modal');
        if (modal) modal.classList.remove('hidden');
    }

    async editCliente(id) {
        try {
            const cliente = await this.makeAuthenticatedRequest(`/api/clientes/${id}`);
            this.currentEditingId = id;

            // Llenar el formulario
            document.getElementById('cedula-rif').value = cliente.cedula_rif;
            document.getElementById('nombre-completo').value = cliente.nombre;
            document.getElementById('telefono').value = cliente.telefono || '';
            document.getElementById('direccion').value = cliente.direccion || '';
            document.getElementById('fecha-registro').value = this.formatDateForInput(cliente.fecha_registro);
            document.getElementById('estado-activo').checked = cliente.estado === 'Activo';

            // Ocultar campo de email
            const emailInput = document.getElementById('email');
            if (emailInput) emailInput.style.display = 'none';
            const emailLabel = document.querySelector('label[for="email"]');
            if (emailLabel) emailLabel.style.display = 'none';

            // Mostrar campos adicionales para edición
            const fechaRegistroGroup = document.getElementById('fecha-registro-group');
            const estadoGroup = document.getElementById('estado-group');
            
            if (fechaRegistroGroup) fechaRegistroGroup.classList.remove('hidden');
            if (estadoGroup) estadoGroup.classList.remove('hidden');

            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
                modalTitle.innerHTML = `
                    <i class="fas fa-edit mr-3 text-purple-600"></i>
                    Editar Cliente
                `;
            }

            const modal = document.getElementById('client-modal');
            if (modal) modal.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            if (error.message !== 'Sesión expirada') {
                this.showError('Error al cargar el cliente');
            }
        }
    }

    async saveCliente(e) {
        e.preventDefault();
        
        const formData = {
            cedula_rif: document.getElementById('cedula-rif').value.trim(),
            nombre: document.getElementById('nombre-completo').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            direccion: document.getElementById('direccion').value.trim()
        };

        // Validaciones básicas
        if (!formData.cedula_rif || !formData.nombre) {
            this.showError('Cédula/RIF y nombre son obligatorios');
            return;
        }

        // Validar formato de cédula/RIF
        if (!this.validarCedulaRIF(formData.cedula_rif)) {
            this.showError('Formato de cédula/RIF inválido. Use V-12345678 o J-123456789');
            return;
        }

        try {
            const url = this.currentEditingId ? 
                `/api/clientes/${this.currentEditingId}` : 
                '/api/clientes';

            const method = this.currentEditingId ? 'PUT' : 'POST';

            // Para edición, agregar estado si está disponible
            if (this.currentEditingId) {
                formData.estado = document.getElementById('estado-activo').checked ? 'Activo' : 'Inactivo';
            }

            await this.makeAuthenticatedRequest(url, {
                method: method,
                body: JSON.stringify(formData)
            });

            this.hideModal();
            this.showSuccess(
                this.currentEditingId ? 
                'Cliente actualizado correctamente' : 
                'Cliente creado correctamente'
            );
            
            this.loadClientes();
            this.loadStats();

        } catch (error) {
            console.error('Error:', error);
            if (error.message !== 'Sesión expirada') {
                this.showError(error.message || 'Error al guardar cliente');
            }
        }
    }

    validarCedulaRIF(cedulaRif) {
        // Validar formato V-12345678 o J-123456789
        const regex = /^[VJEGvjeg]-\d{7,9}$/i;
        return regex.test(cedulaRif);
    }

    confirmDelete(id) {
        this.currentEditingId = id;
        const modal = document.getElementById('master-password-modal');
        if (modal) modal.classList.remove('hidden');
    }

    async verifyMasterPassword(e) {
        e.preventDefault();
        
        const password = document.getElementById('master-password').value;
        const errorDiv = document.getElementById('password-error');

        if (password === this.masterPassword) {
            this.hideMasterPasswordModal();
            const modal = document.getElementById('delete-modal');
            if (modal) modal.classList.remove('hidden');
        } else {
            if (errorDiv) {
                errorDiv.classList.remove('hidden');
                setTimeout(() => errorDiv.classList.add('hidden'), 3000);
            }
        }
    }

    async deleteCliente() {
        try {
            await this.makeAuthenticatedRequest(`/api/clientes/${this.currentEditingId}`, {
                method: 'DELETE'
            });

            this.hideDeleteModal();
            this.showSuccess('Cliente eliminado correctamente');
            this.loadClientes();
            this.loadStats();

        } catch (error) {
            console.error('Error:', error);
            if (error.message !== 'Sesión expirada') {
                this.showError('Error al eliminar el cliente');
            }
        }
    }

    hideModal() {
        const modal = document.getElementById('client-modal');
        if (modal) modal.classList.add('hidden');
    }

    hideMasterPasswordModal() {
        const modal = document.getElementById('master-password-modal');
        const form = document.getElementById('master-password-form');
        const errorDiv = document.getElementById('password-error');
        
        if (modal) modal.classList.add('hidden');
        if (form) form.reset();
        if (errorDiv) errorDiv.classList.add('hidden');
    }

    hideDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) modal.classList.add('hidden');
        this.currentEditingId = null;
    }

    // Clientes.js - Función exportToPDF corregida
async exportToPDF() {
    try {
        this.showNotification('Generando PDF...', 'info');
        
        // Obtener todos los clientes para el reporte
        const allClientes = await this.makeAuthenticatedRequest('/api/clientes?limit=1000');
        const clientesList = allClientes.clientes || allClientes;
        
        // Obtener datos de la empresa desde la ruta correcta
        const empresaData = await this.makeAuthenticatedRequest('/api/empresa');
        
        this.generatePDF(clientesList, empresaData);
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        this.showError('Error al generar el PDF');
    }
}

generatePDF(clientes, empresaData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // --- ENCABEZADO ---
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 0, 179);
    doc.text(empresaData.nombre_empresa || "Na'Guara", 20, 20);
    
    // Información de la empresa
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`RIF: ${empresaData.rif || 'J-123456789'}`, 20, 30);
    doc.text(`Teléfono: ${empresaData.telefono || '(0412) 123-4567'}`, 20, 36);
    doc.text(`Dirección: ${empresaData.direccion || 'Barquisimeto, Venezuela'}`, 20, 42);
    
    // --- TÍTULO DEL REPORTE ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE CLIENTES', 105, 55, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Generado el: ${fechaGeneracion}`, 105, 62, { align: 'center' });
    
    // --- ESTADÍSTICAS RÁPIDAS ---
    const totalClientes = clientes.length;
    const clientesActivos = clientes.filter(c => c.estado === 'Activo').length;
    const clientesInactivos = clientes.filter(c => c.estado === 'Inactivo').length;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN:', 20, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Clientes: ${totalClientes}`, 25, 79);
    doc.text(`• Clientes Activos: ${clientesActivos}`, 25, 85);
    doc.text(`• Clientes Inactivos: ${clientesInactivos}`, 25, 91);
    
    // --- PREPARAR DATOS PARA LA TABLA ---
    const tableData = clientes.map(cliente => [
        cliente.cedula_rif,
        cliente.nombre,
        cliente.telefono || 'N/A',
        cliente.direccion ? (cliente.direccion.length > 30 ? cliente.direccion.substring(0, 27) + '...' : cliente.direccion) : 'N/A',
        cliente.estado,
        new Date(cliente.fecha_registro).toLocaleDateString('es-ES')
    ]);
    
    // --- GENERAR TABLA AUTOMÁTICA ---
    doc.autoTable({
        startY: 100,
        head: [['Cédula/RIF', 'Nombre', 'Teléfono', 'Dirección', 'Estado', 'Fecha Registro']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [90, 0, 179],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 25, fontStyle: 'bold' },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 45 },
            4: { cellWidth: 20 },
            5: { cellWidth: 25 }
        },
        didParseCell: function (data) {
            // Colorear estados
            if (data.column.index === 4 && data.cell.raw === 'Activo') {
                data.cell.styles.textColor = [34, 197, 94];
                data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === 4 && data.cell.raw === 'Inactivo') {
                data.cell.styles.textColor = [239, 68, 68];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        didDrawPage: function (data) {
            // Pie de página
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${data.pageNumber} de ${data.pageCount} - ${empresaData.nombre_empresa || "Na'Guara"}`,
                data.settings.margin.left,
                doc.internal.pageSize.height - 10
            );
            
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(
                data.settings.margin.left,
                doc.internal.pageSize.height - 15,
                doc.internal.pageSize.width - data.settings.margin.right,
                doc.internal.pageSize.height - 15
            );
        }
    });
    
    // --- GUARDAR PDF ---
    const fileName = `clientes_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    this.showSuccess('PDF exportado correctamente');
}

    

    // Utilidades
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Crear notificación toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.add('hidden');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.clientesManager = new ClientesManager();
});