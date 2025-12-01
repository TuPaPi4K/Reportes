// auth-check.js - Versión mejorada
class AuthChecker {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.isLoginPage = window.location.pathname.includes('login.html');
        this.init();
    }

    async init() {
        console.log('🔐 Verificando autenticación en:', window.location.pathname);
        
        if (this.isLoginPage) {
            await this.checkIfAlreadyAuthenticated();
            return;
        }

        const isAuthenticated = await this.checkSession();
        
        if (!isAuthenticated) {
            console.log('❌ Usuario no autenticado, redirigiendo al login...');
            this.redirectToLogin();
        } else {
            console.log('✅ Usuario autenticado');
            // Verificar permisos de página si el usuario está autenticado
            await this.verificarPermisosPagina();
        }
    }

    async verificarPermisosPagina() {
        try {
            const usuario = await this.getCurrentUser();
            if (!usuario) return false;
            
            const paginaActual = window.location.pathname;
            const rol = usuario.rol;
            
            // Definir páginas permitidas por rol
            const paginasPermitidas = {
                'Vendedor': ['/index.html', '/Ventas/', '/Inventario/'],
                'Administrador': ['/index.html', '/Ventas/', '/Inventario/', '/Reportes/', '/Clientes/', '/GestionUsuarios/'],
                'Super Admin': ['/index.html', '/Ventas/', '/Inventario/', '/Compras/', '/Reportes/', '/Configuracion/', '/Clientes/', '/GestionUsuarios/']
            };
            
            // Páginas que todos pueden ver (públicas)
            const paginasPublicas = ['/login.html', '/index.html'];
            
            // Si es página pública, permitir acceso
            if (paginasPublicas.some(ruta => paginaActual.includes(ruta))) {
                return true;
            }
            
            // Verificar si la página actual está permitida para el rol
            const tieneAcceso = paginasPermitidas[rol]?.some(ruta => paginaActual.includes(ruta));
            
            if (!tieneAcceso) {
                console.warn(`⛔ Acceso denegado: Rol ${rol} no puede acceder a ${paginaActual}`);
                this.mostrarErrorAcceso();
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return false;
        }
    }

    mostrarErrorAcceso() {
        // Crear un modal o alerta de acceso denegado
        const errorHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                <div style="background: white; padding: 2rem; border-radius: 10px; text-align: center; max-width: 400px;">
                    <h2 style="color: #e74c3c; margin-bottom: 1rem;">⛔ Acceso Denegado</h2>
                    <p style="margin-bottom: 1.5rem;">No tienes permisos para acceder a esta página.</p>
                    <button onclick="window.location.href='/index.html'" style="background: #3498db; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">
                        Volver al Dashboard
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHTML);
    }

    async checkIfAlreadyAuthenticated() {
        const isAuthenticated = await this.checkSession();
        if (isAuthenticated) {
            console.log('✅ Usuario ya autenticado, redirigiendo al dashboard...');
            this.redirectAfterLogin();
        }
    }

    async checkSession() {
        try {
            const response = await fetch(`${this.API_BASE}/sesion`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.autenticado === true;
            
        } catch (error) {
            console.error('Error verificando sesión:', error);
            return false;
        }
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login.html' && !currentPath.includes('login.html')) {
            sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
            console.log('📍 Guardando ruta para redirección:', currentPath);
        }
        
        window.location.href = '/login.html';
    }

    redirectAfterLogin() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        
        if (redirectUrl && !redirectUrl.includes('login.html')) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        } else {
            window.location.href = '/index.html';
        }
    }

    async getCurrentUser() {
        try {
            // Primero intentar desde localStorage (más rápido)
            const usuarioLocal = localStorage.getItem('usuario');
            if (usuarioLocal) {
                return JSON.parse(usuarioLocal);
            }

            // Si no está en localStorage, hacer request al servidor
            const response = await fetch(`${this.API_BASE}/me`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const user = await response.json();
                localStorage.setItem('usuario', JSON.stringify(user));
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo usuario actual:', error);
            return null;
        }
    }

    async logout() {
        try {
            const response = await fetch('http://localhost:3000/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                localStorage.removeItem('usuario');
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    }

    // Nueva función para forzar actualización de usuario
    async actualizarUsuario() {
        localStorage.removeItem('usuario');
        return await this.getCurrentUser();
    }
}

// Inicializar
const authChecker = new AuthChecker();