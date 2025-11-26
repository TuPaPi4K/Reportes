--
-- PostgreSQL database dump
--

\restrict hYMO9S8DmBMzMKswMbWOXlQ7YRBtCEeqbAZEd1WDLaJSw2p4srFGVA8zhgfvomj

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
    num_factura character varying(30)
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
-- Name: configuracion_negocio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracion_negocio (
    id integer NOT NULL,
    iva_rate numeric(5,2) DEFAULT 16.00,
    stock_minimo integer DEFAULT 10,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.configuracion_negocio OWNER TO postgres;

--
-- Name: configuracion_negocio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracion_negocio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracion_negocio_id_seq OWNER TO postgres;

--
-- Name: configuracion_negocio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracion_negocio_id_seq OWNED BY public.configuracion_negocio.id;


--
-- Name: detalle_compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_compra (
    id integer NOT NULL,
    id_compra integer,
    id_producto integer,
    cantidad numeric(10,2),
    precio_compra numeric(10,2)
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
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    precio_venta numeric(10,2),
    costo_compra numeric(10,2),
    stock numeric(10,2),
    unidad_medida character varying(20),
    id_provedores integer,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    categoria_id integer NOT NULL,
    nombre character varying(100),
    precio_dolares numeric(10,2)
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
    CONSTRAINT usuarios_estado_check CHECK (((estado)::text = ANY ((ARRAY['Activo'::character varying, 'Inactivo'::character varying])::text[]))),
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['Administrador'::character varying, 'Vendedor'::character varying])::text[])))
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
    CONSTRAINT ventas_estado_check CHECK (((estado)::text = ANY ((ARRAY['completada'::character varying, 'cancelada'::character varying, 'pendiente'::character varying])::text[]))),
    CONSTRAINT ventas_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'transferencia'::character varying, 'pago_movil'::character varying, 'tarjeta'::character varying])::text[])))
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
-- Name: configuracion_negocio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_negocio ALTER COLUMN id SET DEFAULT nextval('public.configuracion_negocio_id_seq'::regclass);


--
-- Name: detalle_compra id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra ALTER COLUMN id SET DEFAULT nextval('public.detalle_compra_id_seq'::regclass);


--
-- Name: detalle_venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id SET DEFAULT nextval('public.detalle_venta_id_seq'::regclass);


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
\.


--
-- Data for Name: cierre_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cierre_caja (id, fecha, usuario_id, efectivo_inicial, efectivo_final, total_ventas, total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia, total_ventas_pago_movil, diferencia, estado, fecha_creacion) FROM stdin;
1	2025-10-27	1	0.13	5.93	11.30	5.80	0.00	0.00	5.50	0.00	completado	2025-10-27 09:22:37.996997
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro) FROM stdin;
1	V-12345678	Juan Pérez	0412-1234567	Caracas, Venezuela	Activo	2025-10-23 20:17:38.768564
2	V-87654321	María García	0414-7654321	Valencia, Venezuela	Activo	2025-10-23 20:17:38.768564
3	J-123456789	Empresa ABC C.A.	0212-9876543	Caracas, Venezuela	Activo	2025-10-23 20:17:38.768564
4	V-12345677	fabian da cal	04125566894	calle 13	Activo	2025-10-25 20:51:43.352716
\.


--
-- Data for Name: compras; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compras (id, fecha_compra, id_proveedor, id_usuario, num_factura) FROM stdin;
\.


--
-- Data for Name: configuracion_empresa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion_empresa (id, nombre_empresa, rif, telefono, direccion, mensaje_factura, email) FROM stdin;
1	Na'Guara	J-123456789	(0412) 123-4567	Barquisimeto, Venezuela	¡Gracias por su compra!	PollosNaguara@gmail.com
\.


--
-- Data for Name: configuracion_negocio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion_negocio (id, iva_rate, stock_minimo, fecha_actualizacion) FROM stdin;
1	16.00	10	2025-10-27 10:48:33.693327
2	16.00	5	2025-10-27 11:22:40.699715
3	16.00	10	2025-10-27 11:23:16.030464
\.


--
-- Data for Name: detalle_compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_compra (id, id_compra, id_producto, cantidad, precio_compra) FROM stdin;
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
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, precio_venta, costo_compra, stock, unidad_medida, id_provedores, fecha_actualizacion, categoria_id, nombre, precio_dolares) FROM stdin;
15	8.20	5.00	100.00	unidad	2	2025-10-24 18:53:42.73315	2	Milanesa de Res	0.04
14	6.80	4.20	149.00	unidad	2	2025-10-24 18:53:42.73315	2	Milanesa de Pollo Especial	0.03
12	15.00	10.00	39.00	kg	1	2025-10-24 18:53:42.73315	1	Muslos de Pollo	0.07
10	25.00	18.50	49.00	kg	1	2025-10-24 18:53:42.73315	1	Pollo Entero Premium	0.12
17	4.20	2.10	249.00	unidad	3	2025-10-24 18:53:42.73315	3	Sazonador con Especias	0.02
16	3.50	1.80	298.00	unidad	3	2025-10-24 18:53:42.73315	3	Aliño Completo NaGuara	0.02
11	45.00	32.00	0.00	kg	1	2025-10-24 18:53:42.73315	1	Pecho de Pollo	0.22
18	5.80	2.90	177.00	unidad	3	2025-10-24 18:53:42.73315	3	Adobo Tradicional	0.03
13	5.50	3.50	56.40	unidad	2	2025-10-24 18:53:42.73315	2	Milanesa de Pollo Clásica	0.03
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
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, nombre_usuario, password, rol, estado, fecha_creacion) FROM stdin;
1	Usuario Demo	admin	$2b$10$aTWDxi.hlZhb8Aak/kKzAOn1aPeMa8b4s7KyxrR5WDZZGALNq6rjq	Administrador	Activo	2025-10-27 10:53:25.157895
2	Fabian dacal	Dacal	$2b$10$sLrW6I2cogVZUFyhUqrY2e5lJyE21RwGBiizoIQmoH4cSSJRE0Ydq	Vendedor	Activo	2025-10-27 11:42:36.923343
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id, fecha_venta, id_usuario, metodo_pago, estado, id_cliente) FROM stdin;
5	2025-10-26 10:04:56.701545	1	tarjeta	completada	1
7	2025-10-26 10:13:43.783921	1	efectivo	completada	4
8	2025-10-26 11:04:31.861996	1	efectivo	completada	3
9	2025-10-26 11:25:58.424656	1	efectivo	completada	1
10	2025-10-26 17:56:14.19122	1	efectivo	completada	1
11	2025-10-26 17:57:19.494139	1	efectivo	completada	4
12	2025-10-27 08:28:49.77247	1	pago_movil	completada	1
13	2025-10-27 09:05:06.081386	1	efectivo	completada	4
15	2025-10-27 09:37:19.515523	1	transferencia	completada	1
23	2025-10-27 09:45:57.973156	1	efectivo	completada	1
\.


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_seq', 4, true);


--
-- Name: cierre_caja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cierre_caja_id_seq', 3, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clientes_id_seq', 4, true);


--
-- Name: compras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compras_id_seq', 1, false);


--
-- Name: configuracion_empresa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_empresa_id_seq', 1, true);


--
-- Name: configuracion_negocio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_negocio_id_seq', 3, true);


--
-- Name: detalle_compra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_compra_id_seq', 1, false);


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_venta_id_seq', 28, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 18, true);


--
-- Name: proovedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proovedores_id_seq', 1, false);


--
-- Name: tasa_cambio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasa_cambio_id_seq', 2, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 2, true);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_seq', 23, true);


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
-- Name: configuracion_negocio configuracion_negocio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_negocio
    ADD CONSTRAINT configuracion_negocio_pkey PRIMARY KEY (id);


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
-- Name: productos productos_id_provedores_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_id_provedores_fkey FOREIGN KEY (id_provedores) REFERENCES public.proveedores(id);


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

\unrestrict hYMO9S8DmBMzMKswMbWOXlQ7YRBtCEeqbAZEd1WDLaJSw2p4srFGVA8zhgfvomj

