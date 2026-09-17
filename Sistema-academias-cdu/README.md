# Academias Deportivas CDU — Sistema de Recepción
## Estructura del Proyecto (Fase 1)

```
academias-cdu/
├── index.html              ← Punto de entrada principal
├── css/
│   └── styles.css          ← Todos los estilos
└── js/
    ├── data.js             ← Datos iniciales (socios, pagos, lockers)
    ├── config.js           ← Variables globales y API URL
    ├── api.js              ← Funciones API, reloj, helpers generales
    ├── storage.js          ← Persistencia localStorage + Sheets
    ├── auth.js             ← Login, roles, permisos, usuarios
    ├── inicio.js           ← Dashboard, stats, navegación
    ├── alertas.js          ← Alertas de vencimiento
    ├── socios.js           ← Alta, baja, búsqueda, ficha de socio
    ├── pagos.js            ← Registro de pagos, recibo, pendientes, seguro
    ├── lockers.js          ← Gestión de lockers H/M
    ├── reportes.js         ← Cortes, exportar Excel, sync Sheets
    ├── prueba.js           ← Clases de prueba
    ├── cupos.js            ← Cupos por academia/categoría
    └── start.js            ← Inicialización del sistema
```

## Despliegue en Cloudflare Pages

1. Sube esta carpeta a un repositorio en GitHub
2. Entra a dash.cloudflare.com → Pages → Create application
3. Conecta tu repositorio
4. Build command: (vacío — no hay build)
5. Output directory: / (raíz)
6. Deploy

URL resultante: https://academias-cdu.pages.dev (o tu dominio personalizado)

## Para hacer cambios

- **Cambiar API URL**: edita solo `js/config.js`
- **Cambiar estilos**: edita solo `css/styles.css`
- **Agregar módulo nuevo**: crea `js/nuevo.js` y agrega `<script src="js/nuevo.js">` en `index.html`
- **Fase 2**: reemplazar `js/config.js` con llamadas al backend FastAPI
