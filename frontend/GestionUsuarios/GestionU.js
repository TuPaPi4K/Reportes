// Configuración
const API_BASE_URL = window.location.origin;
let currentEditingUser = null;
let pendingAction = null;
let currentUser = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        // Cargar usuario actual primero
        currentUser = await getCurrentUser();
        await setupDeletePermissions();
        await loadUsers();
        updateUIForUserRole();
    } catch (error) {
        console.error('Error inicializando app:', error);
        showAlert('Error al cargar la aplicación', 'error');
    }
}

function setupEventListeners() {
    // Función segura para agregar event listeners
    function safeAddListener(id, event, handler) {
        try {
            const element = document.getElementById(id);
            if (element && typeof handler === 'function') {
                element.addEventListener(event, handler);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // Botones principales
    safeAddListener('add-user', 'click', showAddUserModal);
    safeAddListener('search-users', 'input', filterUsers);
    safeAddListener('filter-role', 'change', filterUsers);

    // Modal usuario
    safeAddListener('close-user-modal', 'click', closeUserModal);
    safeAddListener('cancel-user', 'click', closeUserModal);
    safeAddListener('user-form', 'submit', saveUser);

    // Modal confirmación
    safeAddListener('close-confirm-modal', 'click', closeConfirmModal);
    safeAddListener('cancel-confirm', 'click', closeConfirmModal);
    safeAddListener('accept-confirm', 'click', acceptConfirm);
 
    // Modal contraseña
    safeAddListener('close-password-modal', 'click', closePasswordModal);
    safeAddListener('cancel-password', 'click', closePasswordModal);
    safeAddListener('save-password', 'click', savePassword);

    // Modal promover
    safeAddListener('close-promote-modal', 'click', closePromoteModal);
    safeAddListener('cancel-promote', 'click', closePromoteModal);
    safeAddListener('confirm-promote', 'click', confirmPromotion);

    // Modal degradar
    safeAddListener('close-demote-modal', 'click', closeDemoteModal);
    safeAddListener('cancel-demote', 'click', closeDemoteModal);
    safeAddListener('confirm-demote', 'click', confirmDemotion);
}

// Función para obtener el usuario actual
async function getCurrentUser() {
    try {
        const response = await fetch('/api/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return null;
    }
}

// Actualizar UI según el rol del usuario
function updateUIForUserRole() {
    if (!currentUser) return;

    const userRoleElement = document.getElementById('user-role');
    if (userRoleElement) {
        userRoleElement.textContent = currentUser.rol.toUpperCase();
        userRoleElement.className = `role-badge role-${currentUser.rol.toLowerCase().replace(' ', '-')}`;
    }

    // Ocultar/mostrar elementos según permisos
    if (currentUser.rol === 'Vendedor') {
        hideElementsForVendedor();
    }
}

function hideElementsForVendedor() {
    // Vendedores no pueden gestionar usuarios
    document.getElementById('add-user').style.display = 'none';
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.style.display = 'none';
    });
}

// Funciones para cargar usuarios desde la API
async function loadUsers() {
    try {
        const response = await fetch('/api/usuarios', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }
        
        const users = await response.json();
        renderUsers(users);
        updateStatistics(users);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar usuarios', 'error');
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = createUserRow(user);
        tbody.appendChild(row);
        applyRowPermissions(user, row);
    });
}

function createUserRow(user) {
    const tr = document.createElement('tr');
    
    // DATASET PARA FILTRADO
    tr.dataset.userId = user.id;
    tr.dataset.userName = user.nombre.toLowerCase();
    tr.dataset.userEmail = user.nombre_usuario.toLowerCase();
    tr.dataset.userRole = user.rol.toLowerCase();
    tr.dataset.userStatus = user.estado.toLowerCase();
    
    tr.className = 'hover:bg-gray-50 transition-colors duration-200';
    
    const isCurrentUser = currentUser && parseInt(user.id) === currentUser.id;
    
    // Determinar color del badge según el rol
    const roleColors = {
        'Super Admin': 'bg-red-100 text-red-800 border-red-200',
        'Administrador': 'bg-purple-100 text-purple-800 border-purple-200',
        'Vendedor': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    // Determinar color del badge según el estado
    const statusColors = {
        'Activo': 'bg-green-100 text-green-800 border-green-200',
        'Inactivo': 'bg-red-100 text-red-800 border-red-200'
    };
    
    tr.innerHTML = `
        <td class="py-3 px-4">
            <input type="checkbox" class="permission-checkbox user-checkbox h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" value="${user.id}">
        </td>
        <td class="py-3 px-4">
            <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                    ${user.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div class="font-semibold text-gray-800 flex items-center">
                        ${user.nombre}
                        ${isCurrentUser ? '<span class="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">Tú</span>' : ''}
                    </div>
                    <div class="text-sm text-gray-500">@${user.nombre_usuario}</div>
                </div>
            </div>
        </td>
        <td class="py-3 px-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.rol] || 'bg-gray-100 text-gray-800 border-gray-200'} border">
                <i class="fas ${getRoleIcon(user.rol)} mr-1 text-xs"></i>
                ${getRoleName(user.rol)}
            </span>
        </td>
        <td class="py-3 px-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[user.estado] || 'bg-gray-100 text-gray-800 border-gray-200'} border">
                <i class="fas ${user.estado === 'Activo' ? 'fa-check-circle mr-1' : 'fa-times-circle mr-1'} text-xs"></i>
                ${user.estado}
            </span>
        </td>
        <td class="py-3 px-4">
            <div class="text-sm text-gray-600" title="${user.fecha_creacion}">
                ${formatRelativeTime(user.fecha_creacion)}
            </div>
        </td>
        <td class="py-3 px-4">
            <div class="text-sm ${user.ultimo_acceso ? 'text-gray-600' : 'text-gray-400'}" title="${user.ultimo_acceso || 'Nunca'}">
                ${user.ultimo_acceso ? formatRelativeTime(user.ultimo_acceso) : 'Nunca'}
            </div>
        </td>
        <td class="py-3 px-4">
            <div class="flex items-center space-x-1">
                <!-- Botón Editar -->
                <button onclick="editUser(${user.id})" class="action-btn bg-blue-500 text-white hover:bg-blue-600 transform hover:scale-105 transition-all duration-200" title="Editar usuario">
                    <i class="fas fa-edit text-xs"></i>
                </button>
                
                <!-- Botón Cambiar Contraseña -->
                <button onclick="changePassword(${user.id})" class="action-btn bg-teal-500 text-white hover:bg-teal-600 transform hover:scale-105 transition-all duration-200" title="Cambiar contraseña">
                    <i class="fas fa-key text-xs"></i>
                </button>
                
                <!-- Botón Promover a Admin (solo para vendedores) -->
                ${user.rol === 'Vendedor' ? `
                <button onclick="showPromoteModal(${user.id})" class="action-btn bg-purple-500 text-white hover:bg-purple-600 transform hover:scale-105 transition-all duration-200" title="Promover a Administrador">
                    <i class="fas fa-user-shield text-xs"></i>
                </button>
                ` : ''}
                
                <!-- Botón Cambiar Estado -->
                <button onclick="toggleUserStatus(${user.id})" class="action-btn ${user.estado === 'Activo' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white transform hover:scale-105 transition-all duration-200" title="${user.estado === 'Activo' ? 'Desactivar usuario' : 'Activar usuario'}">
                    <i class="fas fa-${user.estado === 'Activo' ? 'pause' : 'play'} text-xs"></i>
                </button>
                
                <!-- Botón Eliminar -->
                <button onclick="deleteUser(${user.id})" class="action-btn bg-red-500 text-white hover:bg-red-600 transform hover:scale-105 transition-all duration-200" title="Eliminar usuario">
                    <i class="fas fa-trash text-xs"></i>
                </button>

                <!-- Botón Degradar (solo Super Admin para Administradores) -->
                ${user.rol === 'Administrador' && currentUser && currentUser.rol === 'Super Admin' ? `
                <button onclick="showDemoteModal(${user.id})" class="action-btn bg-orange-500 text-white hover:bg-orange-600 transform hover:scale-105 transition-all duration-200" title="Degradar a Vendedor">
                    <i class="fas fa-user-slash text-xs"></i>
                </button>
                ` : ''}
            </div>
        </td>
    `;
    
    return tr;
}

function getRoleIcon(role) {
    const icons = {
        'Super Admin': 'fa-crown',
        'Administrador': 'fa-user-shield',
        'Vendedor': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

function getRoleName(role) {
    const names = {
        'Super Admin': 'Super Admin',
        'Administrador': 'Administrador',
        'Vendedor': 'Vendedor'
    };
    return names[role] || role;
}

// Aplicar permisos por fila - ACTUALIZADO PARA SUPER ADMIN
function applyRowPermissions(user, rowElement) {
    if (!currentUser) return;
    
    const actionButtons = rowElement.querySelectorAll('.action-btn');
    const isOwnUser = parseInt(user.id) === currentUser.id;
    const isAdmin = currentUser.rol === 'Administrador';
    const isSuperAdmin = currentUser.rol === 'Super Admin';
    const canManageUsers = isAdmin || isSuperAdmin;
    
    actionButtons.forEach(button => {
        const icon = button.querySelector('i');
        let shouldHide = false;
        
        if (icon.classList.contains('fa-edit')) {
            // Solo admin y super admin pueden editar
            shouldHide = !canManageUsers;
            // Super admin puede editar todos, admin no puede editar super admin
            if (isAdmin && user.rol === 'Super Admin') {
                shouldHide = true;
            }
        }
        else if (icon.classList.contains('fa-key')) {
            // Solo puede cambiar contraseña propia o si es admin/super admin
            shouldHide = !isOwnUser && !canManageUsers;
            // Admin no puede cambiar contraseña de super admin
            if (isAdmin && user.rol === 'Super Admin') {
                shouldHide = true;
            }
        }
        else if (icon.classList.contains('fa-user-shield')) {
            // Solo admin y super admin pueden promover vendedores
            shouldHide = user.rol !== 'Vendedor' || !canManageUsers;
        }
        else if (icon.classList.contains('fa-pause') || icon.classList.contains('fa-play')) {
            // Solo admin y super admin pueden cambiar estado, pero no el propio
            shouldHide = !canManageUsers || isOwnUser;
            // Admin no puede cambiar estado de super admin
            if (isAdmin && user.rol === 'Super Admin') {
                shouldHide = true;
            }
        }
        else if (icon.classList.contains('fa-trash')) {
            // Solo admin y super admin pueden eliminar, pero no el propio
            shouldHide = !canManageUsers || isOwnUser;
            // Nadie puede eliminar super admin
            if (user.rol === 'Super Admin') {
                shouldHide = true;
            }
            // Admin no puede eliminar otros admin
            if (isAdmin && user.rol === 'Administrador') {
                shouldHide = true;
            }
        }
        else if (icon.classList.contains('fa-user-slash')) {
            // Solo super admin puede degradar administradores
            shouldHide = user.rol !== 'Administrador' || !isSuperAdmin || isOwnUser;
        }
        
        button.style.display = shouldHide ? 'none' : '';
    });
    
    // Controlar checkbox de selección
    const checkbox = rowElement.querySelector('.user-checkbox');
    if (checkbox) {
        checkbox.style.display = canManageUsers ? '' : 'none';
    }
}

function updateStatistics(users) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.estado === 'Activo').length;
    const superAdminUsers = users.filter(u => u.rol === 'Super Admin').length;
    const adminUsers = users.filter(u => u.rol === 'Administrador').length;
    const vendorUsers = users.filter(u => u.rol === 'Vendedor' && u.estado === 'Activo').length;

    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('active-users').textContent = activeUsers;
    document.getElementById('super-admin-users').textContent = superAdminUsers;
    document.getElementById('admin-users').textContent = adminUsers;
    document.getElementById('vendor-users').textContent = vendorUsers;
}


function showAddUserModal() {
    if (!currentUser || (currentUser.rol !== 'Administrador' && currentUser.rol !== 'Super Admin')) {
    showAlert('Solo los administradores y super administradores pueden crear usuarios', 'error');
    return;
}
    
    console.log('Usuario actual:', currentUser); 
    console.log('Rol actual:', currentUser.rol); 
    
    currentEditingUser = null;
    document.getElementById('user-modal-title').innerHTML = '<i class="fas fa-user-plus mr-2"></i>Nuevo Usuario';
    document.getElementById('user-form').reset();
    document.getElementById('password-section').style.display = 'block';
    document.getElementById('user-password').required = true;
    document.getElementById('user-password-confirm').required = true;
    
const roleSelect = document.getElementById('user-role-select');    
    let roleOptions = `
        <option value="">Seleccionar rol</option>
        <option value="vendor">Vendedor</option>
        <option value="admin">Administrador</option>
    `;
    
    // Solo Super Admin puede crear otros Super Admin
    if (currentUser && currentUser.rol === 'Super Admin') {
        roleOptions += '<option value="super_admin">Super Administrador</option>';
        console.log('✅ Opción Super Admin agregada'); // Para debug
    } else {
        console.log('❌ Usuario no es Super Admin, no se agrega opción'); // Para debug
    }
    
    roleSelect.innerHTML = roleOptions;
    
    document.getElementById('user-status').value = 'active';
    document.getElementById('user-modal').classList.remove('hidden');
}

async function editUser(userId) {
    // Verificar permisos
    if (!currentUser || (currentUser.rol !== 'Administrador' && currentUser.rol !== 'Super Admin')) {
        showAlert('Solo los administradores pueden editar usuarios', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/usuarios/${userId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const user = await response.json();
        currentEditingUser = user;
        
        // Verificar permisos específicos
        if (currentUser.rol === 'Administrador' && user.rol === 'Super Admin') {
            showAlert('No tienes permisos para editar Super Administradores', 'error');
            return;
        }
        
        document.getElementById('user-modal-title').innerHTML = '<i class="fas fa-user-edit mr-2"></i>Editar Usuario';
        
        const roleMapping = {
            'Super Admin': 'super_admin',
            'Administrador': 'admin',
            'Vendedor': 'vendor'
        };
        
        const statusMapping = {
            'Activo': 'active',
            'Inactivo': 'inactive'
        };
        
        document.getElementById('user-name').value = user.nombre;
        document.getElementById('username').value = user.nombre_usuario;
        document.getElementById('user-status').value = statusMapping[user.estado] || user.estado;
        
        const roleSelect = document.getElementById('user-role-select');

        let roleOptions = `
            <option value="">Seleccionar rol</option>
            <option value="vendor">Vendedor</option>
            <option value="admin">Administrador</option>
        `;
        
        // Solo Super Admin puede asignar rol de Super Admin
        if (currentUser.rol === 'Super Admin') {
            roleOptions += '<option value="super_admin">Super Administrador</option>';
        }
        
        roleSelect.innerHTML = roleOptions;
        roleSelect.value = roleMapping[user.rol] || user.rol;
        
        document.getElementById('password-section').style.display = 'none';
        document.getElementById('user-password').required = false;
        document.getElementById('user-password-confirm').required = false;
        
        document.getElementById('user-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar usuario', 'error');
    }
}

async function saveUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    const roleMapping = {
        'super_admin': 'Super Admin',
        'admin': 'Administrador',
        'vendor': 'Vendedor'
    };
    
    const userData = {
        nombre: formData.get('name'),
        nombre_usuario: formData.get('username'),
        rol: roleMapping[formData.get('role')] || formData.get('role'),
        estado: formData.get('status') === 'active' ? 'Activo' : 'Inactivo',
        password: formData.get('password')
    };

    // Validar que Super Admin solo pueda ser creado por otro Super Admin
    if (userData.rol === 'Super Admin' && currentUser.rol !== 'Super Admin') {
        showAlert('Solo los Super Administradores pueden crear otros Super Administradores', 'error');
        return;
    }

    if (!userData.nombre || !userData.nombre_usuario || !userData.rol) {
        showAlert('Por favor complete todos los campos obligatorios');
        return;
    }

    if (!currentEditingUser && !userData.password) {
        showAlert('La contraseña es obligatoria para nuevos usuarios');
        return;
    }

    try {
        let response;
        if (currentEditingUser) {
            response = await fetch(`/api/usuarios/${currentEditingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
        } else {
            response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar usuario');
        }

        const result = await response.json();
        closeUserModal();
        loadUsers();
        showAlert(result.message || 'Usuario guardado exitosamente', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || 'Error al guardar usuario', 'error');
    }
}

// Funciones para cambiar estado de usuario - ACTUALIZADO
async function toggleUserStatus(userId) {
    try {
        const userResponse = await fetch(`/api/usuarios/${userId}`, {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const user = await userResponse.json();
        
        // Verificar permisos
        if (currentUser.rol === 'Administrador' && user.rol === 'Super Admin') {
            showAlert('No puedes desactivar Super Administradores', 'error');
            return;
        }
        
        // Verificar que no sea el usuario actual
        if (currentUser && parseInt(userId) === currentUser.id) {
            showAlert('No puedes desactivar tu propio usuario', 'error');
            return;
        }
        
        const newStatus = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
        const action = newStatus === 'Inactivo' ? 'desactivar' : 'activar';
        
        showConfirmModal(
            `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
            `¿Está seguro que desea ${action} a ${user.nombre}?`,
            async () => {
                try {
                    const response = await fetch(`/api/usuarios/${userId}/estado`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ estado: newStatus })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error al cambiar estado');
                    }

                    const result = await response.json();
                    loadUsers();
                    showAlert(result.message || 'Estado actualizado exitosamente', 'success');
                } catch (error) {
                    console.error('Error:', error);
                    showAlert(error.message || 'Error al cambiar estado', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar usuario', 'error');
    }
}

// Funciones para eliminar usuario - ACTUALIZADO
async function deleteUser(userId) {
    try {
        const userResponse = await fetch(`/api/usuarios/${userId}`, {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const user = await userResponse.json();

        // Verificar permisos
        if (user.rol === 'Super Admin') {
            showAlert('No se pueden eliminar Super Administradores', 'error');
            return;
        }

        if (currentUser.rol === 'Administrador' && user.rol === 'Administrador') {
            showAlert('Los Administradores no pueden eliminar otros Administradores', 'error');
            return;
        }

        // Verificar que no sea el usuario actual
        if (currentUser && parseInt(userId) === currentUser.id) {
            showAlert('No puedes eliminar tu propio usuario', 'error');
            return;
        }

        showConfirmModal(
            '¿Eliminar usuario?',
            `¿Está seguro que desea eliminar permanentemente a <strong>${user.nombre}</strong> (<em>${user.nombre_usuario}</em>)?<br><br>
            <span class="text-red-600 font-semibold">Esta acción no se puede deshacer.</span>`,
            async () => {
                try {
                    const response = await fetch(`/api/usuarios/${userId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error al eliminar usuario');
                    }

                    const result = await response.json();
                    await loadUsers();
                    showAlert(result.message || 'Usuario eliminado exitosamente', 'success');
                    
                } catch (error) {
                    console.error('Error eliminando usuario:', error);
                    showAlert(error.message || 'Error al eliminar usuario', 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar información del usuario', 'error');
    }
}

// Nueva función para degradar administradores
async function showDemoteModal(userId) {
    try {
        const userResponse = await fetch(`/api/usuarios/${userId}`, {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const user = await userResponse.json();

        // Verificar que sea administrador
        if (user.rol !== 'Administrador') {
            showAlert('Solo se pueden degradar administradores', 'warning');
            return;
        }

        // Verificar que no sea el usuario actual
        if (currentUser && parseInt(userId) === currentUser.id) {
            showAlert('No puedes degradar tu propio usuario', 'error');
            return;
        }

        // Guardar información en el modal
        document.getElementById('demote-user-name').textContent = user.nombre;
        document.getElementById('demote-user-name').setAttribute('data-user-id', userId);
        
        document.getElementById('demote-modal').classList.remove('hidden');
        document.getElementById('demote-password').focus();
        document.getElementById('demote-error').classList.add('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar información del usuario', 'error');
    }
}

async function confirmDemotion() {
    const userId = document.getElementById('demote-user-name').getAttribute('data-user-id');
    const password = document.getElementById('demote-password').value;
    const errorDiv = document.getElementById('demote-error');
    const errorText = document.getElementById('demote-error-text');

    if (!userId) {
        errorText.textContent = 'Error: No se pudo identificar el usuario';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (!password) {
        errorText.textContent = 'La clave de confirmación es requerida';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`/api/usuarios/${userId}/degradar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                rol: 'Vendedor',
                clave_confirmacion: password 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al degradar usuario');
        }

        const result = await response.json();
        closeDemoteModal();
        await loadUsers();
        showAlert(result.message || 'Usuario degradado a vendedor exitosamente', 'success');
        
    } catch (error) {
        console.error('Error degradando usuario:', error);
        errorText.textContent = error.message || 'Error al degradar usuario';
        errorDiv.classList.remove('hidden');
    }
}

function closeDemoteModal() {
    document.getElementById('demote-modal').classList.add('hidden');
    document.getElementById('demote-password').value = '';
    document.getElementById('demote-error').classList.add('hidden');
}

// Funciones existentes para cambiar contraseña
async function changePassword(userId) {
    try {
        const userResponse = await fetch(`/api/usuarios/${userId}`, {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const user = await userResponse.json();
        
        // Verificar permisos: solo admin puede cambiar contraseñas de otros
        if (parseInt(userId) !== currentUser.id && currentUser.rol !== 'Administrador' && currentUser.rol !== 'Super Admin') {
            showAlert('Solo los administradores pueden cambiar contraseñas de otros usuarios', 'error');
            return;
        }

        // Verificar que admin no pueda cambiar contraseña de super admin
        if (currentUser.rol === 'Administrador' && user.rol === 'Super Admin') {
            showAlert('No puedes cambiar la contraseña de un Super Administrador', 'error');
            return;
        }

        document.getElementById('password-user-id').value = userId;
        document.getElementById('password-form').reset();
        document.getElementById('password-error').classList.add('hidden');
        
        // Actualizar título según si es propio usuario o otro
        const title = document.querySelector('#password-modal h2');
        if (parseInt(userId) === currentUser.id) {
            title.innerHTML = '<i class="fas fa-key mr-2"></i>Cambiar Mi Contraseña';
        } else {
            title.innerHTML = `<i class="fas fa-key mr-2"></i>Cambiar Contraseña de ${user.nombre}`;
        }
        
        document.getElementById('password-modal').classList.remove('hidden');
        document.getElementById('new-password').focus();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar información del usuario', 'error');
    }
}

async function savePassword() {
    const userId = document.getElementById('password-user-id').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('password-error');
    const errorText = document.getElementById('password-error-text');

    // Validaciones
    if (!newPassword || !confirmPassword) {
        errorText.textContent = 'Por favor complete ambos campos';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (newPassword.length < 6) {
        errorText.textContent = 'La contraseña debe tener al menos 6 caracteres';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (newPassword !== confirmPassword) {
        errorText.textContent = 'Las contraseñas no coinciden';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`/api/usuarios/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ password: newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cambiar contraseña');
        }

        const result = await response.json();
        closePasswordModal();
        showAlert(result.message || 'Contraseña cambiada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        errorText.textContent = error.message || 'Error al cambiar contraseña';
        errorDiv.classList.remove('hidden');
    }
}

// Funciones para promover usuarios (mantener existentes)
async function showPromoteModal(userId) {
    try {
        const userResponse = await fetch(`/api/usuarios/${userId}`, {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const user = await userResponse.json();

        // Verificar que sea vendedor
        if (user.rol !== 'Vendedor') {
            showAlert('Solo se pueden promover vendedores a administradores', 'warning');
            return;
        }

        // Guardar el userId en el elemento promote-user-name
        const promoteUserName = document.getElementById('promote-user-name');
        promoteUserName.textContent = user.nombre;
        promoteUserName.setAttribute('data-user-id', userId);
        
        document.getElementById('promote-modal').classList.remove('hidden');
        document.getElementById('admin-password').focus();
        document.getElementById('promote-error').classList.add('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar información del usuario', 'error');
    }
}

async function confirmPromotion() {
    const userId = document.getElementById('promote-user-name').getAttribute('data-user-id');
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('promote-error');
    const errorText = document.getElementById('promote-error-text');

    if (!userId) {
        errorText.textContent = 'Error: No se pudo identificar el usuario';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (!password) {
        errorText.textContent = 'La clave de confirmación es requerida';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`/api/usuarios/${userId}/promover`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ clave_confirmacion: password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al promover usuario');
        }

        const result = await response.json();
        closePromoteModal();
        await loadUsers();
        showAlert(result.message || 'Usuario promovido a administrador exitosamente', 'success');
        
    } catch (error) {
        console.error('Error promoviendo usuario:', error);
        errorText.textContent = error.message || 'Error al promover usuario';
        errorDiv.classList.remove('hidden');
    }
}

function closePromoteModal() {
    document.getElementById('promote-modal').classList.add('hidden');
    document.getElementById('admin-password').value = '';
    document.getElementById('promote-error').classList.add('hidden');
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.add('hidden');
    document.getElementById('password-form').reset();
    document.getElementById('password-error').classList.add('hidden');
}

// Funciones de utilidad - FILTRADO ACTUALIZADO
function filterUsers() {
    try {
        const searchTerm = document.getElementById('search-users').value.toLowerCase();
        const roleFilter = document.getElementById('filter-role').value;
        
        const rows = document.querySelectorAll('#users-table-body tr');
        
        rows.forEach(row => {
            try {
                if (!row) return;
                
                const userName = row.dataset.userName || '';
                const userEmail = row.dataset.userEmail || '';
                const userRole = row.dataset.userRole || '';
                
                const matchesSearch = userName.includes(searchTerm) || 
                                    userEmail.includes(searchTerm);
                
                let matchesRole = true;
                if (roleFilter) {
                    const roleMapping = {
                        'super_admin': 'super admin',
                        'admin': 'administrador',
                        'vendor': 'vendedor'
                    };
                    const targetRole = roleMapping[roleFilter] || roleFilter.toLowerCase();
                    matchesRole = userRole === targetRole;
                }
                
                row.style.display = matchesSearch && matchesRole ? '' : 'none';
                
            } catch (rowError) {
                console.error('Error procesando fila:', rowError);
                row.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error en filterUsers:', error);
    }
}

function showConfirmModal(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
    
    const acceptBtn = document.getElementById('accept-confirm');
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    
    newAcceptBtn.addEventListener('click', () => {
        closeConfirmModal();
        callback();
    });
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
}

function acceptConfirm() {
    closeConfirmModal();
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
    currentEditingUser = null;
}

function closeTempAccessModal() {
    document.getElementById('temp-access-modal').classList.add('hidden');
    currentEditingUser = null;
}

// Ocultar botones de eliminar si no tiene permisos - ACTUALIZADO
async function setupDeletePermissions() {
    if (!currentUser || (currentUser.rol !== 'Administrador' && currentUser.rol !== 'Super Admin')) {
        document.getElementById('add-user').style.display = 'none';
    }
}

// Función auxiliar para formatear tiempo relativo
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Hoy';
    } else if (diffDays === 1) {
        return 'Ayer';
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return date.toLocaleDateString('es-VE');
    }
}

// Funciones para acceso temporal
function showTempAccessModal(userId) {
    showAlert('Funcionalidad de acceso temporal en desarrollo', 'info');
}

function grantTempAccess() {
    showAlert('Funcionalidad de acceso temporal en desarrollo', 'info');
}

function showAlert(message, type = 'info') {
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