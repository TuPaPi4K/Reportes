--
-- PostgreSQL database dump
--

\restrict oZMJsHtOHhE7DufWwdodoglzCswcgJt8ZRcdQ7BYQ1WC1E9310ge2dcbn0kTNvZ

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    estado character varying(10) DEFAULT 'Activa'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: cierre_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cierre_caja (
    id integer NOT NULL,
    fecha date NOT NULL,
    usuario_id integer,
    efectivo_inicial numeric(10,2) DEFAULT 0,
    efectivo_final numeric(10,2) DEFAULT 0,
    total_ventas numeric(10,2) DEFAULT 0,
    total_ventas_efectivo numeric(10,2) DEFAULT 0,
    total_ventas_tarjeta numeric(10,2) DEFAULT 0,
    total_ventas_transferencia numeric(10,2) DEFAULT 0,
    total_ventas_pago_movil numeric(10,2) DEFAULT 0,
    diferencia numeric(10,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'completado'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cierre_caja OWNER TO postgres;

--
-- Name: cierre_caja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cierre_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cierre_caja_id_seq OWNER TO postgres;

--
-- Name: cierre_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cierre_caja_id_seq OWNED BY public.cierre_caja.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    cedula_rif character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    telefono character varying(20),
    direccion text,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clientes_estado_check CHECK (((estado)::text = ANY ((ARRAY['Activo'::character varying, 'Inactivo'::character varying])::text[])))
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: compras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compras (
    id integer NOT NULL,
    fecha_compra date DEFAULT CURRENT_DATE NOT NULL,
    id_proveedor integer,
    id_usuario integer,
    num_factura character varying(30),
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    total numeric(10,2) DEFAULT 0,
    observaciones text,
    fecha_recepcion timestamp without time zone,
    CONSTRAINT compras_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'recibida'::character varying, 'cancelada'::character varying, 'parcial'::character varying])::text[])))
);


ALTER TABLE public.compras OWNER TO postgres;

--
-- Name: compras_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.compras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compras_id_seq OWNER TO postgres;

--
-- Name: compras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.compras_id_seq OWNED BY public.compras.id;


--
-- Name: configuracion_empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracion_empresa (
    id integer NOT NULL,
    nombre_empresa character varying(100) DEFAULT 'Na''Guara'::character varying,
    rif character varying(20) DEFAULT 'J-123456789'::character varying,
    telefono character varying(20) DEFAULT '(0412) 123-4567'::character varying,
    direccion text DEFAULT 'Caracas, Venezuela'::text,
    mensaje_factura text DEFAULT '¡Gracias por su compra!'::text,
    email character varying(40)
);


ALTER TABLE public.configuracion_empresa OWNER TO postgres;

--
-- Name: configuracion_empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracion_empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracion_empresa_id_seq OWNER TO postgres;

--
-- Name: configuracion_empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracion_empresa_id_seq OWNED BY public.configuracion_empresa.id;


--
-- Name: detalle_compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_compra (
    id integer NOT NULL,
    id_compra integer,
    id_producto integer,
    cantidad numeric(10,2),
    precio_compra numeric(10,2),
    cantidad_recibida numeric(10,2) DEFAULT 0,
    lote character varying(50),
    fecha_vencimiento date
);


ALTER TABLE public.detalle_compra OWNER TO postgres;

--
-- Name: detalle_compra_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_compra_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_compra_id_seq OWNER TO postgres;

--
-- Name: detalle_compra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_compra_id_seq OWNED BY public.detalle_compra.id;


--
-- Name: detalle_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_venta (
    id integer NOT NULL,
    id_venta integer,
    id_producto integer,
    cantidad numeric(10,2),
    precio_unitario numeric(10,2)
);


ALTER TABLE public.detalle_venta OWNER TO postgres;

--
-- Name: detalle_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_venta_id_seq OWNER TO postgres;

--
-- Name: detalle_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_venta_id_seq OWNED BY public.detalle_venta.id;


--
-- Name: historial_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_inventario (
    id integer NOT NULL,
    producto_id integer,
    usuario_id integer,
    stock_anterior numeric(10,2),
    stock_nuevo numeric(10,2),
    motivo text,
    tipo_movimiento character varying(20),
    fecha_movimiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.historial_inventario OWNER TO postgres;

--
-- Name: historial_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_inventario_id_seq OWNER TO postgres;

--
-- Name: historial_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_inventario_id_seq OWNED BY public.historial_inventario.id;


--
-- Name: metodos_pago_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metodos_pago_config (
    id integer NOT NULL,
    metodo_id character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    habilitado boolean DEFAULT true,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.metodos_pago_config OWNER TO postgres;

--
-- Name: metodos_pago_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metodos_pago_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metodos_pago_config_id_seq OWNER TO postgres;

--
-- Name: metodos_pago_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metodos_pago_config_id_seq OWNED BY public.metodos_pago_config.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    precio_venta numeric(10,2),
    costo_compra numeric(10,2),
    stock numeric(10,2),
    unidad_medida character varying(20),
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    categoria_id integer NOT NULL,
    nombre character varying(100),
    precio_dolares numeric(10,2),
    id_provedores integer,
    stock_minimo numeric(10,2) DEFAULT 10,
    id_tasa_iva integer DEFAULT 1,
    estado character varying(20) DEFAULT 'Activo'::character varying
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO postgres;

--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedores (
    id integer CONSTRAINT proovedores_id_not_null NOT NULL,
    nombre character varying(100),
    contacto character varying(50),
    direccion character varying(30)
);


ALTER TABLE public.proveedores OWNER TO postgres;

--
-- Name: proovedores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proovedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proovedores_id_seq OWNER TO postgres;

--
-- Name: proovedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proovedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: tasa_cambio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasa_cambio (
    id integer NOT NULL,
    tasa_bs numeric(10,2) NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fuente character varying(50) DEFAULT 'api'::character varying,
    activo boolean DEFAULT true
);


ALTER TABLE public.tasa_cambio OWNER TO postgres;

--
-- Name: tasa_cambio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasa_cambio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasa_cambio_id_seq OWNER TO postgres;

--
-- Name: tasa_cambio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasa_cambio_id_seq OWNED BY public.tasa_cambio.id;


--
-- Name: tasas_iva; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasas_iva (
    id integer NOT NULL,
    tasa numeric(5,2) NOT NULL,
    descripcion character varying(100) NOT NULL,
    tipo character varying(20) NOT NULL,
    estado character varying(10) DEFAULT 'Activa'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasas_iva_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['general'::character varying, 'reducido'::character varying, 'exento'::character varying])::text[])))
);


ALTER TABLE public.tasas_iva OWNER TO postgres;

--
-- Name: tasas_iva_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasas_iva_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasas_iva_id_seq OWNER TO postgres;

--
-- Name: tasas_iva_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasas_iva_id_seq OWNED BY public.tasas_iva.id;


--
-- Name: transformacion_detalles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transformacion_detalles (
    id integer NOT NULL,
    transformacion_id integer NOT NULL,
    producto_destino_id integer NOT NULL,
    cantidad_destino numeric(10,2) NOT NULL
);


ALTER TABLE public.transformacion_detalles OWNER TO postgres;

--
-- Name: transformacion_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transformacion_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transformacion_detalles_id_seq OWNER TO postgres;

--
-- Name: transformacion_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transformacion_detalles_id_seq OWNED BY public.transformacion_detalles.id;


--
-- Name: transformacion_producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transformacion_producto (
    id integer NOT NULL,
    fecha_transformacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_id integer,
    producto_origen_id integer,
    cantidad_origen numeric(10,2),
    observaciones text
);


ALTER TABLE public.transformacion_producto OWNER TO postgres;

--
-- Name: transformacion_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transformacion_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transformacion_producto_id_seq OWNER TO postgres;

--
-- Name: transformacion_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transformacion_producto_id_seq OWNED BY public.transformacion_producto.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    nombre_usuario character varying(50) NOT NULL,
    password character varying(255),
    rol character varying(20) NOT NULL,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso timestamp without time zone,
    CONSTRAINT usuarios_estado_check CHECK (((estado)::text = ANY ((ARRAY['Activo'::character varying, 'Inactivo'::character varying])::text[]))),
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['Super Admin'::character varying, 'Administrador'::character varying, 'Vendedor'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    fecha_venta timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario integer,
    metodo_pago character varying(15) DEFAULT 'Efectivo'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'completada'::character varying,
    id_cliente integer,
    detalles_pago jsonb,
    referencia_pago character varying(100),
    banco_pago character varying(50),
    monto_recibido numeric(10,2),
    cambio numeric(10,2),
    motivo_anulacion text,
    CONSTRAINT ventas_estado_check CHECK (((estado)::text = ANY ((ARRAY['completada'::character varying, 'cancelada'::character varying, 'pendiente'::character varying, 'anulada'::character varying])::text[]))),
    CONSTRAINT ventas_metodo_pago_check CHECK (((metodo_pago)::text = ANY (ARRAY[('efectivo'::character varying)::text, ('tarjeta'::character varying)::text, ('transferencia'::character varying)::text, ('pago_movil'::character varying)::text, ('efectivo_bs'::character varying)::text, ('efectivo_usd'::character varying)::text, ('punto_venta'::character varying)::text, ('mixto'::character varying)::text])))
);


ALTER TABLE public.ventas OWNER TO postgres;

--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventas_id_seq OWNER TO postgres;

--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: cierre_caja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cierre_caja ALTER COLUMN id SET DEFAULT nextval('public.cierre_caja_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: compras id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compras ALTER COLUMN id SET DEFAULT nextval('public.compras_id_seq'::regclass);


--
-- Name: configuracion_empresa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_empresa ALTER COLUMN id SET DEFAULT nextval('public.configuracion_empresa_id_seq'::regclass);


--
-- Name: detalle_compra id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra ALTER COLUMN id SET DEFAULT nextval('public.detalle_compra_id_seq'::regclass);


--
-- Name: detalle_venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id SET DEFAULT nextval('public.detalle_venta_id_seq'::regclass);


--
-- Name: historial_inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario ALTER COLUMN id SET DEFAULT nextval('public.historial_inventario_id_seq'::regclass);


--
-- Name: metodos_pago_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago_config ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_config_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proovedores_id_seq'::regclass);


--
-- Name: tasa_cambio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasa_cambio ALTER COLUMN id SET DEFAULT nextval('public.tasa_cambio_id_seq'::regclass);


--
-- Name: tasas_iva id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasas_iva ALTER COLUMN id SET DEFAULT nextval('public.tasas_iva_id_seq'::regclass);


--
-- Name: transformacion_detalles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_detalles ALTER COLUMN id SET DEFAULT nextval('public.transformacion_detalles_id_seq'::regclass);


--
-- Name: transformacion_producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_producto ALTER COLUMN id SET DEFAULT nextval('public.transformacion_producto_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, nombre, descripcion, estado, fecha_creacion) FROM stdin;
1	Pollo	Productos derivados del pollo	Activa	2025-10-24 18:51:18.983894
2	Milanesa	Milanesas de pollo y res	Activa	2025-10-24 18:51:18.983894
3	Aliño	Condimentos y aderezos	Activa	2025-10-24 18:51:18.983894
4	Embutidos	Salchichas, chorizos y otros embutidos	Activa	2025-10-24 18:51:18.983894
11	Prueba	uiuiuiui	Inactiva	2025-11-22 13:25:01.498352
\.


--
-- Data for Name: cierre_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cierre_caja (id, fecha, usuario_id, efectivo_inicial, efectivo_final, total_ventas, total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia, total_ventas_pago_movil, diferencia, estado, fecha_creacion) FROM stdin;
1	2025-10-27	1	0.13	5.93	11.30	5.80	0.00	0.00	5.50	0.00	completado	2025-10-27 09:22:37.996997
4	2025-11-01	1	10.00	10.00	1237.30	0.00	680.00	15.00	350.00	0.00	completado	2025-11-01 12:33:29.816532
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro) FROM stdin;
1	V-12345678	Juan Pérez	0412-1234567	Caracas, Venezuela	Activo	2025-10-23 20:17:38.768564
2	V-87654321	María García	0414-7654321	Valencia, Venezuela	Activo	2025-10-23 20:17:38.768564
3	J-123456789	Empresa ABC C.A.	0212-9876543	Caracas, Venezuela	Activo	2025-10-23 20:17:38.768564
4	V-12345677	Fabian da cal	04125566894	calle 13	Activo	2025-10-25 20:51:43.352716
5	V-12345674	jesus	04125566897	sss	Activo	2025-11-05 10:46:32.318949
\.


--
-- Data for Name: compras; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compras (id, fecha_compra, id_proveedor, id_usuario, num_factura, estado, total, observaciones, fecha_recepcion) FROM stdin;
1	2025-11-23	1	1	FAC-001	recibida	18.50	primera compra	2025-11-23 15:59:18.013605
2	2025-11-23	1	1	FAC-001	recibida	69.24	prueba	2025-11-23 16:09:58.702282
3	2025-11-23	1	1	FAC-003	recibida	39.60	sasasasas	2025-11-23 16:10:19.325104
\.


--
-- Data for Name: configuracion_empresa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion_empresa (id, nombre_empresa, rif, telefono, direccion, mensaje_factura, email) FROM stdin;
1	Na'Guara	J-123456789	(0412) 123-4567	Barquisimeto, Venezuela	¡Gracias por su compra!	PollosNaguara@gmail.com
\.


--
-- Data for Name: detalle_compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_compra (id, id_compra, id_producto, cantidad, precio_compra, cantidad_recibida, lote, fecha_vencimiento) FROM stdin;
1	1	10	1.00	18.50	1.00	Lote-Gen	\N
2	2	13	10.00	3.50	10.00	Gen	\N
3	2	11	1.07	32.00	1.07	Gen	\N
4	3	14	6.00	4.20	6.00	Gen	\N
5	3	12	1.44	10.00	1.44	Gen	\N
\.


--
-- Data for Name: detalle_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_venta (id, id_venta, id_producto, cantidad, precio_unitario) FROM stdin;
3	5	13	1.00	5.50
5	7	18	1.00	5.80
6	8	13	1.00	5.50
7	8	14	1.00	6.80
8	8	12	1.00	15.00
9	8	11	1.00	45.00
10	8	10	1.00	25.00
11	8	18	1.00	5.80
12	8	16	1.00	3.50
13	8	17	1.00	4.20
14	9	16	1.00	3.50
15	10	13	40.00	5.50
16	11	11	29.00	45.00
17	12	13	1.00	5.50
18	13	18	1.00	5.80
20	15	13	99.00	5.50
28	23	13	1.60	5.50
29	24	13	4.00	5.50
30	25	13	1.00	5.50
31	26	14	7.50	6.80
32	27	13	9.00	5.50
33	28	14	6.00	6.80
34	29	12	1.00	15.00
35	30	14	5.00	6.80
36	31	14	100.00	6.80
37	32	16	100.00	3.50
38	33	14	10.00	6.80
39	34	16	3.00	3.50
40	35	13	1.00	5.50
41	36	13	1.00	5.50
42	37	13	1.00	5.50
43	38	16	1.00	3.50
44	39	10	1.10	25.00
45	40	14	4.00	6.80
46	41	16	1.00	3.50
47	41	20	1.00	1560.00
48	42	14	16.50	6.80
49	43	19	1.00	150.00
50	43	13	1.00	5.50
51	44	16	1.00	3.50
52	44	20	1.80	1560.00
53	45	19	1.10	150.00
54	45	13	1.00	5.50
\.


--
-- Data for Name: historial_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_inventario (id, producto_id, usuario_id, stock_anterior, stock_nuevo, motivo, tipo_movimiento, fecha_movimiento) FROM stdin;
1	10	1	49.00	50.00	producto perdido	entrada_ajuste	2025-11-19 14:15:01.745736
2	10	1	50.00	5.00	test	salida_ajuste	2025-11-19 14:25:20.347451
3	10	1	5.00	49.00	t	entrada_ajuste	2025-11-19 14:27:45.611874
4	20	1	47.20	48.00	proveedor agregado	entrada_ajuste	2025-11-23 14:19:05.940287
5	13	1	41.40	41.00	proveedor agregado	salida_ajuste	2025-11-23 14:19:48.051748
6	10	1	43.97	43.00	proveedor agregado	salida_ajuste	2025-11-23 14:20:21.493999
\.


--
-- Data for Name: metodos_pago_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metodos_pago_config (id, metodo_id, nombre, habilitado, fecha_actualizacion) FROM stdin;
1	efectivo	Efectivo	t	2025-11-03 14:34:31.087937
4	pago_movil	Pago Móvil	t	2025-11-03 14:34:31.087937
3	transferencia	Transferencia	t	2025-11-23 19:16:44.206927
2	tarjeta	Tarjeta	t	2025-11-23 19:25:44.230939
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, precio_venta, costo_compra, stock, unidad_medida, fecha_actualizacion, categoria_id, nombre, precio_dolares, id_provedores, stock_minimo, id_tasa_iva, estado) FROM stdin;
16	3.50	1.80	193.00	unidad	2025-10-24 18:53:42.73315	3	Aliño Completo NaGuara	0.02	3	10.00	1	Activo
15	8.20	5.00	100.00	unidad	2025-10-24 18:53:42.73315	2	Milanesa de Res	0.04	2	10.00	1	Activo
18	5.80	2.90	177.00	unidad	2025-10-24 18:53:42.73315	3	Adobo Tradicional	0.03	3	10.00	1	Activo
20	1560.00	1000.00	48.00	kg	2025-11-23 14:19:05.940287	4	jamon de pierna	6.59	2	10.00	2	Activo
17	4.20	2.10	250.00	unidad	2025-11-23 14:20:38.20384	3	Sazonador con Especias	0.02	3	5.00	1	Activo
10	25.00	18.50	44.00	kg	2025-11-23 14:20:21.493999	1	Pollo Entero Premium	0.12	1	50.00	1	Activo
11	45.00	32.00	81.07	kg	2025-11-23 16:09:58.702282	1	Pecho de Pollo	0.19	1	10.00	1	Activo
14	6.80	4.20	58.00	unidad	2025-11-23 16:10:19.325104	2	Milanesa de Pollo Especial	0.03	1	10.00	1	Activo
12	15.00	10.00	39.94	kg	2025-11-23 16:10:19.325104	1	Muslos de Pollo	0.07	1	10.00	1	Activo
19	150.00	90.00	78.90	kg	2025-11-23 14:20:30.411127	1	Pollo picado	0.63	1	10.00	2	Activo
13	5.50	3.50	50.00	unidad	2025-11-23 16:09:58.702282	2	Milanesa de Pollo Clásica	0.03	1	10.00	1	Activo
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proveedores (id, nombre, contacto, direccion) FROM stdin;
1	Avícola La Esperanza	0412-1112233	Caracas
2	Carnicería El Rodeo	0414-4445566	Maracay
3	Especias Don Pepe	0416-7778899	Valencia
\.


--
-- Data for Name: tasa_cambio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasa_cambio (id, tasa_bs, fecha_actualizacion, fuente, activo) FROM stdin;
1	215.89	2025-10-26 17:29:56.958182	manual	t
2	216.37	2025-10-26 17:40:13.446462	api	t
3	218.17	2025-10-28 11:47:27.119438	api	t
4	219.87	2025-10-29 10:17:03.284757	api	t
5	223.96	2025-11-01 10:54:49.19683	api	t
6	250.00	2025-11-03 12:42:42.183994	manual	t
7	223.96	2025-11-03 12:42:42.373016	api	t
8	250.00	2025-11-03 12:58:54.922164	manual	t
9	223.96	2025-11-03 12:58:55.135478	api	t
10	226.13	2025-11-05 10:44:58.103153	api	t
11	228.48	2025-11-08 09:32:19.570451	api	t
12	231.09	2025-11-11 09:38:58.67725	api	t
13	233.05	2025-11-12 10:50:00.271878	api	t
14	236.46	2025-11-16 13:18:37.716717	api	t
15	236.84	2025-11-17 18:31:55.173452	api	t
16	237.75	2025-11-19 11:59:33.863795	api	t
17	243.11	2025-11-22 12:43:39.822098	api	t
\.


--
-- Data for Name: tasas_iva; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasas_iva (id, tasa, descripcion, tipo, estado, fecha_creacion, fecha_actualizacion) FROM stdin;
2	0.00	Exento de IVA	exento	Activa	2025-11-15 20:47:15.542161	2025-11-15 20:47:15.542161
3	8.00	IVA Reducido	reducido	Activa	2025-11-15 20:47:15.542161	2025-11-15 20:47:15.542161
1	20.00	IVA General	general	Activa	2025-11-15 20:47:15.542161	2025-11-23 19:25:47.98708
\.


--
-- Data for Name: transformacion_detalles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transformacion_detalles (id, transformacion_id, producto_destino_id, cantidad_destino) FROM stdin;
1	1	14	2.00
2	1	19	1.00
3	1	12	0.50
4	2	11	30.00
\.


--
-- Data for Name: transformacion_producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transformacion_producto (id, fecha_transformacion, usuario_id, producto_origen_id, cantidad_origen, observaciones) FROM stdin;
1	2025-11-22 14:45:11.79763	1	10	5.00	test
2	2025-11-22 14:56:59.737289	1	10	0.03	
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, nombre_usuario, password, rol, estado, fecha_creacion, ultimo_acceso) FROM stdin;
2	Fabian dacal	Dacal7	$2b$10$sLrW6I2cogVZUFyhUqrY2e5lJyE21RwGBiizoIQmoH4cSSJRE0Ydq	Administrador	Activo	2025-11-02 12:55:48.732599	2025-11-09 13:56:14.005874
7	mauricioo	varela	$2b$10$AG9TYxnUFeWyUlGM4jO4FezGq2abxxINwbOyZeQYMoV59NAs1zKjK	Vendedor	Activo	2025-11-02 12:55:48.732599	2025-11-09 17:59:33.503432
8	francisco	velazco	$2b$10$afUaXHy9l/wTgSYrCxAN3OKPr9/FpoleSBQlqKuHsCsALoCs2Sweq	Super Admin	Activo	2025-11-08 11:43:17.74226	\N
3	Enrique	Perez	$2b$10$GB6VRiHdl7ONeuO.GSsLYeZe6tb6rfm6LoNGcML.AoUuZZueDELh6	Administrador	Activo	2025-11-02 12:55:48.732599	\N
1	Usuario Demo	admin	$2b$10$aTWDxi.hlZhb8Aak/kKzAOn1aPeMa8b4s7KyxrR5WDZZGALNq6rjq	Super Admin	Activo	2025-11-02 12:55:48.732599	2025-11-23 19:47:33.599525
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id, fecha_venta, id_usuario, metodo_pago, estado, id_cliente, detalles_pago, referencia_pago, banco_pago, monto_recibido, cambio, motivo_anulacion) FROM stdin;
5	2025-10-26 10:04:56.701545	1	tarjeta	completada	1	\N	\N	\N	\N	\N	\N
7	2025-10-26 10:13:43.783921	1	efectivo	completada	4	\N	\N	\N	\N	\N	\N
8	2025-10-26 11:04:31.861996	1	efectivo	completada	3	\N	\N	\N	\N	\N	\N
9	2025-10-26 11:25:58.424656	1	efectivo	completada	1	\N	\N	\N	\N	\N	\N
10	2025-10-26 17:56:14.19122	1	efectivo	completada	1	\N	\N	\N	\N	\N	\N
11	2025-10-26 17:57:19.494139	1	efectivo	completada	4	\N	\N	\N	\N	\N	\N
12	2025-10-27 08:28:49.77247	1	pago_movil	completada	1	\N	\N	\N	\N	\N	\N
13	2025-10-27 09:05:06.081386	1	efectivo	completada	4	\N	\N	\N	\N	\N	\N
15	2025-10-27 09:37:19.515523	1	transferencia	completada	1	\N	\N	\N	\N	\N	\N
23	2025-10-27 09:45:57.973156	1	efectivo	completada	1	\N	\N	\N	\N	\N	\N
24	2025-10-27 12:54:04.414553	1	tarjeta	completada	1	\N	\N	\N	\N	\N	\N
25	2025-10-27 13:49:56.696027	2	transferencia	completada	1	\N	\N	\N	\N	\N	\N
26	2025-10-28 15:06:51.55373	1	transferencia	completada	1	\N	\N	\N	\N	\N	\N
27	2025-11-01 11:19:57.317312	1	efectivo_usd	completada	1	{"tasa": 223.9622, "total": 0.26, "change": 0.74, "method": "efectivo_usd", "received": 1}	\N	\N	1.00	0.74	\N
28	2025-11-01 11:23:45.058256	1	efectivo_usd	completada	1	{"tasa": 223.9622, "total": 0.21, "change": 4.79, "method": "efectivo_usd", "received": 5}	\N	\N	5.00	4.79	\N
29	2025-11-01 11:26:14.208204	1	transferencia	completada	4	{"bank": "Banesco", "total": 17.4, "amount": 17.4, "method": "transferencia", "holderId": "V-12345677", "reference": "123456789"}	123456789	Banesco	\N	\N	\N
30	2025-11-01 11:30:13.379898	1	mixto	completada	4	{"total": 39.44, "method": "mixto", "payments": [{"amount": 15, "method": "efectivo_bs"}, {"amount": 24.44, "method": "punto_venta"}]}	\N	\N	\N	\N	\N
31	2025-11-01 12:09:04.830358	1	punto_venta	completada	4	{"total": 788.8, "amount": 788.8, "method": "punto_venta", "reference": "7788"}	7788	\N	\N	\N	\N
32	2025-11-01 12:13:25.226615	1	pago_movil	completada	4	{"bank": "Banesco", "total": 406, "amount": 406, "method": "pago_movil", "holderId": "V-12345677", "reference": "123456789"}	123456789	Banesco	\N	\N	\N
33	2025-11-01 12:15:43.717679	1	efectivo_usd	completada	4	{"tasa": 223.9622, "total": 0.35, "change": 0.65, "method": "efectivo_usd", "received": 1}	\N	\N	1.00	0.65	\N
34	2025-11-01 12:34:28.409911	1	efectivo_bs	completada	1	{"total": 12.18, "change": 0, "method": "efectivo_bs", "received": 12.18}	\N	\N	12.18	\N	\N
37	2025-11-09 14:07:28.630746	1	pago_movil	anulada	4	{"bank": "Banesco", "total": 6.38, "amount": 6.38, "method": "pago_movil", "holderId": "V-12345677", "reference": "123456789"}	123456789	Banesco	\N	\N	duplicada
36	2025-11-09 14:07:13.869783	1	pago_movil	anulada	4	{"bank": "Banesco", "total": 6.38, "amount": 6.38, "method": "pago_movil", "holderId": "V-12345677", "reference": "123456789"}	123456789	Banesco	\N	\N	plicadadu
35	2025-11-08 09:42:57.251864	1	efectivo_usd	anulada	4	{"tasa": 228.4796, "total": 0.03, "change": 1.97, "method": "efectivo_usd", "received": 2}	\N	\N	2.00	1.97	test
38	2025-11-11 09:53:13.03235	1	mixto	anulada	1	{"total": 4.06, "method": "mixto", "payments": [{"amount": 2, "method": "efectivo_bs"}, {"amount": 2.06, "method": "efectivo_usd"}]}	\N	\N	\N	\N	ghuvflerifbuyughfuwp3eofhipqruhbvreifhunwñeifhuñwaeriufhwpo3fhupwufobhñ4fgb
39	2025-11-11 11:20:05.451608	1	transferencia	anulada	4	{"bank": "Mercantil", "total": 31.9, "amount": 31.9, "method": "transferencia", "holderId": "V-12345677", "reference": "987654321"}	987654321	Mercantil	\N	\N	rtrtgrg
40	2025-11-16 16:51:12.841242	1	efectivo_bs	completada	1	{"total": 31.55, "change": 0, "method": "efectivo_bs", "received": 31.55}	\N	\N	31.55	\N	\N
41	2025-11-18 13:39:09.15553	1	pago_movil	completada	1	{"bank": "Mercantil", "total": 1564.06, "amount": 1564.06, "method": "pago_movil", "holderId": "V-12345677", "reference": "987654322"}	987654322	Mercantil	\N	\N	\N
42	2025-11-18 13:47:01.225986	1	efectivo_usd	completada	1	{"tasa": 236.84, "total": 0.55, "change": 0.44999999999999996, "method": "efectivo_usd", "received": 1}	\N	\N	1.00	0.45	\N
43	2025-11-18 14:38:31.225606	1	efectivo_bs	completada	1	{"total": 156.38, "change": 43.620000000000005, "method": "efectivo_bs", "received": 200}	\N	\N	200.00	43.62	\N
44	2025-11-22 12:55:08.891953	1	mixto	completada	4	{"total": 3261.34, "method": "mixto", "payments": [{"amount": 1500, "method": "efectivo_bs"}, {"amount": 1761.34, "method": "efectivo_usd"}]}	\N	\N	\N	\N	\N
45	2025-11-23 19:48:07.3842	1	efectivo_bs	completada	1	{"total": 171.6, "change": 0, "method": "efectivo_bs", "received": 171.6}	\N	\N	171.60	\N	\N
\.


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_seq', 11, true);


--
-- Name: cierre_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cierre_caja_id_seq', 4, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clientes_id_seq', 5, true);


--
-- Name: compras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compras_id_seq', 3, true);


--
-- Name: configuracion_empresa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_empresa_id_seq', 1, true);


--
-- Name: detalle_compra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_compra_id_seq', 5, true);


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_venta_id_seq', 54, true);


--
-- Name: historial_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_inventario_id_seq', 6, true);


--
-- Name: metodos_pago_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metodos_pago_config_id_seq', 4, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 21, true);


--
-- Name: proovedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proovedores_id_seq', 1, false);


--
-- Name: tasa_cambio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasa_cambio_id_seq', 17, true);


--
-- Name: tasas_iva_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasas_iva_id_seq', 3, true);


--
-- Name: transformacion_detalles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transformacion_detalles_id_seq', 4, true);


--
-- Name: transformacion_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transformacion_producto_id_seq', 2, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 8, true);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_seq', 45, true);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: cierre_caja cierre_caja_fecha_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cierre_caja
    ADD CONSTRAINT cierre_caja_fecha_usuario_id_key UNIQUE (fecha, usuario_id);


--
-- Name: cierre_caja cierre_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cierre_caja
    ADD CONSTRAINT cierre_caja_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_cedula_rif_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cedula_rif_key UNIQUE (cedula_rif);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: compras compras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_pkey PRIMARY KEY (id);


--
-- Name: configuracion_empresa configuracion_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_empresa
    ADD CONSTRAINT configuracion_empresa_pkey PRIMARY KEY (id);


--
-- Name: detalle_compra detalle_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_pkey PRIMARY KEY (id);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id);


--
-- Name: historial_inventario historial_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago_config metodos_pago_config_metodo_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago_config
    ADD CONSTRAINT metodos_pago_config_metodo_id_key UNIQUE (metodo_id);


--
-- Name: metodos_pago_config metodos_pago_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago_config
    ADD CONSTRAINT metodos_pago_config_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proovedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proovedores_pkey PRIMARY KEY (id);


--
-- Name: tasa_cambio tasa_cambio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasa_cambio
    ADD CONSTRAINT tasa_cambio_pkey PRIMARY KEY (id);


--
-- Name: tasas_iva tasas_iva_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasas_iva
    ADD CONSTRAINT tasas_iva_pkey PRIMARY KEY (id);


--
-- Name: transformacion_detalles transformacion_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_detalles
    ADD CONSTRAINT transformacion_detalles_pkey PRIMARY KEY (id);


--
-- Name: transformacion_producto transformacion_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_producto
    ADD CONSTRAINT transformacion_producto_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_nombre_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: idx_clientes_cedula; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_cedula ON public.clientes USING btree (cedula_rif);


--
-- Name: cierre_caja cierre_caja_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cierre_caja
    ADD CONSTRAINT cierre_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: compras compras_id_proveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id);


--
-- Name: compras compras_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id);


--
-- Name: detalle_compra detalle_compra_id_compra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_id_compra_fkey FOREIGN KEY (id_compra) REFERENCES public.compras(id);


--
-- Name: detalle_compra detalle_compra_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id);


--
-- Name: productos fk_producto_categoria; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: transformacion_detalles fk_producto_destino; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_detalles
    ADD CONSTRAINT fk_producto_destino FOREIGN KEY (producto_destino_id) REFERENCES public.productos(id);


--
-- Name: productos fk_producto_tasa_iva; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT fk_producto_tasa_iva FOREIGN KEY (id_tasa_iva) REFERENCES public.tasas_iva(id);


--
-- Name: transformacion_detalles fk_transformacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_detalles
    ADD CONSTRAINT fk_transformacion FOREIGN KEY (transformacion_id) REFERENCES public.transformacion_producto(id) ON DELETE CASCADE;


--
-- Name: historial_inventario historial_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: historial_inventario historial_inventario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: productos productos_id_provedores_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_id_provedores_fkey FOREIGN KEY (id_provedores) REFERENCES public.proveedores(id);


--
-- Name: transformacion_producto transformacion_producto_producto_entrada_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_producto
    ADD CONSTRAINT transformacion_producto_producto_entrada_id_fkey FOREIGN KEY (producto_origen_id) REFERENCES public.productos(id);


--
-- Name: transformacion_producto transformacion_producto_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transformacion_producto
    ADD CONSTRAINT transformacion_producto_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: ventas ventas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id);


--
-- Name: ventas ventas_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id);


--
-- PostgreSQL database dump complete
--

\unrestrict oZMJsHtOHhE7DufWwdodoglzCswcgJt8ZRcdQ7BYQ1WC1E9310ge2dcbn0kTNvZ

